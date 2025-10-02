import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { bilingual } from '../utils/bilingual';
import { z } from 'zod';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    language: string;
    role: string;
  };
}

export class SupportController {
  constructor(private storage: IStorage) {}

  async createTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const ticketSchema = z.object({
        subject: z.string().min(1),
        subject_ar: z.string().optional(),
        message: z.string().min(1),
        priority: z.enum(['low', 'medium', 'high']).optional()
      });

      const validation = ticketSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', userLanguage),
          errors: validation.error.errors
        });
      }

      const { subject, subject_ar, message, priority } = validation.data;

      // Create support ticket
      const ticket = await this.storage.createSupportTicket({
        userId,
        subject,
        subjectAr: subject_ar || null,
        status: 'open',
        priority: priority || 'medium',
        assignedTo: null
      });

      // Create initial message
      const initialMessage = await this.storage.createSupportMessage({
        ticketId: ticket.id,
        senderId: userId,
        message,
        attachments: null
      });

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('support.ticket_created', userLanguage),
        data: {
          ticket_id: ticket.id,
          subject: userLanguage === 'ar' ? ticket.subjectAr || ticket.subject : ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          message_id: initialMessage.id,
          created_at: ticket.createdAt
        }
      });

    } catch (error) {
      console.error('Create support ticket error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getUserTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const tickets = await this.storage.getUserSupportTickets(userId);

      const ticketsWithDetails = tickets.map(ticket => ({
        id: ticket.id,
        subject: userLanguage === 'ar' ? ticket.subjectAr || ticket.subject : ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        assigned_to: ticket.assignedTo,
        created_at: ticket.createdAt,
        updated_at: ticket.updatedAt
      }));

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('support.tickets_retrieved', userLanguage),
        data: {
          tickets: ticketsWithDetails,
          total_count: ticketsWithDetails.length
        }
      });

    } catch (error) {
      console.error('Get user tickets error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const ticketId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const ticket = await this.storage.getSupportTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('support.ticket_not_found', userLanguage)
        });
      }

      // Verify ticket belongs to user (unless admin)
      if (ticket.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Get messages
      const messages = await this.storage.getTicketMessages(ticketId);

      // Get assignee details if assigned
      let assigneeDetails = null;
      if (ticket.assignedTo) {
        assigneeDetails = await this.storage.getUser(ticket.assignedTo);
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('support.ticket_retrieved', userLanguage),
        data: {
          id: ticket.id,
          subject: userLanguage === 'ar' ? ticket.subjectAr || ticket.subject : ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          assignee: assigneeDetails ? {
            id: assigneeDetails.id,
            name: assigneeDetails.name,
            role: assigneeDetails.role
          } : null,
          messages: messages.map(msg => ({
            id: msg.id,
            sender_id: msg.senderId,
            message: msg.message,
            attachments: msg.attachments,
            created_at: msg.createdAt
          })),
          created_at: ticket.createdAt,
          updated_at: ticket.updatedAt
        }
      });

    } catch (error) {
      console.error('Get ticket error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const messageSchema = z.object({
        ticket_id: z.string().uuid(),
        message: z.string().min(1),
        attachments: z.any().optional()
      });

      const validation = messageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', userLanguage),
          errors: validation.error.errors
        });
      }

      const { ticket_id, message, attachments } = validation.data;

      // Verify ticket exists and user has access
      const ticket = await this.storage.getSupportTicket(ticket_id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('support.ticket_not_found', userLanguage)
        });
      }

      if (ticket.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Create message
      const newMessage = await this.storage.createSupportMessage({
        ticketId: ticket_id,
        senderId: userId,
        message,
        attachments: attachments || null
      });

      // Update ticket status if it was resolved and customer is replying
      if (ticket.status === 'resolved' && ticket.userId === userId) {
        await this.storage.updateSupportTicket(ticket_id, {
          status: 'open'
        });
      }

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('support.message_sent', userLanguage),
        data: {
          message_id: newMessage.id,
          ticket_id: ticket_id,
          sender_id: userId,
          message: message,
          attachments: attachments || null,
          created_at: newMessage.createdAt
        }
      });

    } catch (error) {
      console.error('Send support message error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getTicketMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const ticketId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      // Verify ticket access
      const ticket = await this.storage.getSupportTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('support.ticket_not_found', userLanguage)
        });
      }

      if (ticket.userId !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      const messages = await this.storage.getTicketMessages(ticketId);

      // Get sender details for each message
      const messagesWithSenders = await Promise.all(
        messages.map(async (msg) => {
          const sender = await this.storage.getUser(msg.senderId);
          return {
            id: msg.id,
            sender: {
              id: sender?.id,
              name: sender?.name,
              role: sender?.role
            },
            message: msg.message,
            attachments: msg.attachments,
            created_at: msg.createdAt
          };
        })
      );

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('support.messages_retrieved', userLanguage),
        data: {
          ticket_id: ticketId,
          messages: messagesWithSenders,
          total_count: messagesWithSenders.length
        }
      });

    } catch (error) {
      console.error('Get ticket messages error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getFAQs(req: Request, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || 'en';
      const category = req.query.category as string;

      const faqs = await this.storage.getFAQs(category);

      const localizedFAQs = faqs.map(faq => {
        const questionData = faq.question as any;
        const answerData = faq.answer as any;

        return {
          id: faq.id,
          category: faq.category,
          question: questionData?.[userLanguage] || questionData?.en || 'Question',
          answer: answerData?.[userLanguage] || answerData?.en || 'Answer',
          sort_order: faq.sortOrder,
          created_at: faq.createdAt
        };
      });

      // Group by category
      const groupedFAQs = localizedFAQs.reduce((acc: Record<string, any[]>, faq) => {
        if (!acc[faq.category]) {
          acc[faq.category] = [];
        }
        acc[faq.category].push(faq);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('support.faqs_retrieved', userLanguage),
        data: {
          faqs: category ? localizedFAQs : groupedFAQs,
          categories: Object.keys(groupedFAQs),
          total_count: localizedFAQs.length
        }
      });

    } catch (error) {
      console.error('Get FAQs error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  // Admin methods for managing support
  async getAllTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.admin_only', userLanguage)
        });
      }

      const status = req.query.status as string;
      const priority = req.query.priority as string;

      // This would need proper filtering in the storage layer
      // For now, get all tickets for all users (simplified implementation)
      const allTickets: any[] = []; // Placeholder - would need proper admin query

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('support.all_tickets_retrieved', userLanguage),
        data: {
          tickets: allTickets,
          total_count: allTickets.length,
          filters: { status, priority }
        }
      });

    } catch (error) {
      console.error('Get all tickets error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async assignTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const ticketId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.admin_only', userLanguage)
        });
      }

      const { assigned_to } = req.body;

      if (!assigned_to) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.assigned_to_required', userLanguage)
        });
      }

      // Verify assignee exists and is admin/support staff
      const assignee = await this.storage.getUser(assigned_to);
      if (!assignee || !['admin', 'support'].includes(assignee.role)) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('support.invalid_assignee', userLanguage)
        });
      }

      const updatedTicket = await this.storage.updateSupportTicket(ticketId, {
        assignedTo: assigned_to,
        status: 'in_progress'
      });

      if (!updatedTicket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('support.ticket_not_found', userLanguage)
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('support.ticket_assigned', userLanguage),
        data: {
          ticket_id: ticketId,
          assigned_to: assigned_to,
          assignee_name: assignee.name,
          new_status: 'in_progress'
        }
      });

    } catch (error) {
      console.error('Assign ticket error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async updateTicketStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const ticketId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!['admin', 'support'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.insufficient_permissions', userLanguage)
        });
      }

      const { status } = req.body;
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_status', userLanguage)
        });
      }

      const updatedTicket = await this.storage.updateSupportTicket(ticketId, {
        status: status as any
      });

      if (!updatedTicket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('support.ticket_not_found', userLanguage)
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('support.ticket_status_updated', userLanguage),
        data: {
          ticket_id: ticketId,
          old_status: updatedTicket.status,
          new_status: status,
          updated_at: updatedTicket.updatedAt
        }
      });

    } catch (error) {
      console.error('Update ticket status error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }
}
