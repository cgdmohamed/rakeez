import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { bilingual } from '../utils/bilingual';
import { createAddressSchema, validateSchema } from '../middleware/validation';
import crypto from 'crypto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    language: string;
    role: string;
  };
}

export class ProfileController {
  constructor(private storage: IStorage) {}

  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const user = await this.storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('user.not_found', userLanguage)
        });
      }

      // Get wallet balance
      const walletBalance = await this.storage.getUserWalletBalance(userId);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('profile.retrieved_successfully', userLanguage),
        data: {
          id: user.id,
          name: user.name,
          name_ar: user.nameAr,
          email: user.email,
          phone: user.phone,
          role: user.role,
          language: user.language,
          is_verified: user.isVerified,
          wallet_balance: walletBalance,
          created_at: user.createdAt,
          updated_at: user.updatedAt
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const { name, name_ar, language, device_token } = req.body;

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (name_ar) updateData.nameAr = name_ar;
      if (language) updateData.language = language;
      if (device_token) updateData.deviceToken = device_token;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.no_data_provided', userLanguage)
        });
      }

      const updatedUser = await this.storage.updateUser(userId, updateData);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('user.not_found', userLanguage)
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('profile.updated_successfully', userLanguage),
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          name_ar: updatedUser.nameAr,
          email: updatedUser.email,
          phone: updatedUser.phone,
          language: updatedUser.language,
          updated_at: updatedUser.updatedAt
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getAddresses(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const addresses = await this.storage.getUserAddresses(userId);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('addresses.retrieved_successfully', userLanguage),
        data: addresses.map(address => ({
          id: address.id,
          title: address.title,
          address: address.address,
          address_ar: address.addressAr,
          city: address.city,
          district: address.district,
          building_number: address.buildingNumber,
          apartment_number: address.apartmentNumber,
          latitude: address.latitude ? parseFloat(address.latitude) : null,
          longitude: address.longitude ? parseFloat(address.longitude) : null,
          is_default: address.isDefault,
          created_at: address.createdAt
        }))
      });

    } catch (error) {
      console.error('Get addresses error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async createAddress(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const validation = createAddressSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', userLanguage),
          errors: validation.error.errors
        });
      }

      const addressData = validation.data;

      // If this is set as default, unset other default addresses
      if (addressData.is_default) {
        const existingAddresses = await this.storage.getUserAddresses(userId);
        for (const address of existingAddresses) {
          if (address.isDefault) {
            await this.storage.updateAddress(address.id, { isDefault: false });
          }
        }
      }

      const newAddress = await this.storage.createAddress({
        userId,
        title: addressData.title,
        address: addressData.address,
        addressAr: addressData.address_ar || null,
        city: addressData.city,
        district: addressData.district || null,
        buildingNumber: addressData.building_number || null,
        apartmentNumber: addressData.apartment_number || null,
        latitude: addressData.latitude ? addressData.latitude.toString() : null,
        longitude: addressData.longitude ? addressData.longitude.toString() : null,
        isDefault: addressData.is_default || false
      });

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('addresses.created_successfully', userLanguage),
        data: {
          id: newAddress.id,
          title: newAddress.title,
          address: newAddress.address,
          address_ar: newAddress.addressAr,
          city: newAddress.city,
          district: newAddress.district,
          building_number: newAddress.buildingNumber,
          apartment_number: newAddress.apartmentNumber,
          latitude: newAddress.latitude ? parseFloat(newAddress.latitude) : null,
          longitude: newAddress.longitude ? parseFloat(newAddress.longitude) : null,
          is_default: newAddress.isDefault,
          created_at: newAddress.createdAt
        }
      });

    } catch (error) {
      console.error('Create address error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async updateAddress(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const addressId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      // Verify address belongs to user
      const addresses = await this.storage.getUserAddresses(userId);
      const addressExists = addresses.find(addr => addr.id === addressId);

      if (!addressExists) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('addresses.not_found', userLanguage)
        });
      }

      const updateData = req.body;
      
      // If setting as default, unset other defaults
      if (updateData.is_default) {
        for (const address of addresses) {
          if (address.isDefault && address.id !== addressId) {
            await this.storage.updateAddress(address.id, { isDefault: false });
          }
        }
      }

      const updatedAddress = await this.storage.updateAddress(addressId, {
        title: updateData.title,
        address: updateData.address,
        addressAr: updateData.address_ar,
        city: updateData.city,
        district: updateData.district,
        buildingNumber: updateData.building_number,
        apartmentNumber: updateData.apartment_number,
        latitude: updateData.latitude ? updateData.latitude.toString() : undefined,
        longitude: updateData.longitude ? updateData.longitude.toString() : undefined,
        isDefault: updateData.is_default
      });

      if (!updatedAddress) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('addresses.update_failed', userLanguage)
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('addresses.updated_successfully', userLanguage),
        data: {
          id: updatedAddress.id,
          title: updatedAddress.title,
          address: updatedAddress.address,
          address_ar: updatedAddress.addressAr,
          city: updatedAddress.city,
          district: updatedAddress.district,
          building_number: updatedAddress.buildingNumber,
          apartment_number: updatedAddress.apartmentNumber,
          latitude: updatedAddress.latitude ? parseFloat(updatedAddress.latitude) : null,
          longitude: updatedAddress.longitude ? parseFloat(updatedAddress.longitude) : null,
          is_default: updatedAddress.isDefault
        }
      });

    } catch (error) {
      console.error('Update address error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async deleteAddress(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const addressId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      // Verify address belongs to user
      const addresses = await this.storage.getUserAddresses(userId);
      const addressExists = addresses.find(addr => addr.id === addressId);

      if (!addressExists) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('addresses.not_found', userLanguage)
        });
      }

      const deleted = await this.storage.deleteAddress(addressId);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: bilingual.getErrorMessage('addresses.delete_failed', userLanguage)
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('addresses.deleted_successfully', userLanguage)
      });

    } catch (error) {
      console.error('Delete address error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const balance = await this.storage.getUserWalletBalance(userId);
      const recentTransactions = await this.storage.getUserWalletTransactions(userId, 10);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('wallet.retrieved_successfully', userLanguage),
        data: {
          balance: balance,
          currency: 'SAR',
          recent_transactions: recentTransactions.map(transaction => ({
            id: transaction.id,
            type: transaction.type,
            amount: parseFloat(transaction.amount),
            balance_before: parseFloat(transaction.balanceBefore),
            balance_after: parseFloat(transaction.balanceAfter),
            description: transaction.description,
            description_ar: transaction.descriptionAr,
            order_id: transaction.orderId,
            reference_id: transaction.referenceId,
            created_at: transaction.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('Get wallet error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async topupWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const { amount, payment_method, payment_source } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_amount', userLanguage)
        });
      }

      if (!payment_method || !['moyasar', 'tabby'].includes(payment_method)) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_payment_method', userLanguage)
        });
      }

      // Get current balance
      const currentBalance = await this.storage.getUserWalletBalance(userId);

      // Create wallet transaction record
      const transaction = await this.storage.createWalletTransaction({
        userId,
        type: 'topup',
        amount: amount.toString(),
        balanceBefore: currentBalance.toString(),
        balanceAfter: (currentBalance + amount).toString(),
        description: `Wallet top-up via ${payment_method}`,
        descriptionAr: `شحن المحفظة عبر ${payment_method}`,
        referenceId: `topup_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
      });

      // In production, integrate with actual payment gateway
      // For now, simulate successful payment
      console.log(`Wallet top-up: ${amount} SAR via ${payment_method} for user ${userId}`);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('wallet.topup_successful', userLanguage),
        data: {
          transaction_id: transaction.id,
          old_balance: currentBalance,
          new_balance: currentBalance + amount,
          amount: amount,
          currency: 'SAR',
          payment_method,
          timestamp: transaction.createdAt
        }
      });

    } catch (error) {
      console.error('Wallet top-up error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getWalletTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await this.storage.getUserWalletTransactions(userId, limit);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('wallet.transactions_retrieved', userLanguage),
        data: {
          transactions: transactions.map(transaction => ({
            id: transaction.id,
            type: transaction.type,
            amount: parseFloat(transaction.amount),
            balance_before: parseFloat(transaction.balanceBefore),
            balance_after: parseFloat(transaction.balanceAfter),
            description: transaction.description,
            description_ar: transaction.descriptionAr,
            order_id: transaction.orderId,
            reference_id: transaction.referenceId,
            created_at: transaction.createdAt
          })),
          total_count: transactions.length
        }
      });

    } catch (error) {
      console.error('Get wallet transactions error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async generateReferralCode(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      // Check if user already has an active referral code
      const existingReferrals = await this.storage.getUserReferrals(userId);
      const activeReferral = existingReferrals.find(ref => ref.status === 'pending' || ref.status === 'completed');

      if (activeReferral) {
        return res.status(200).json({
          success: true,
          message: bilingual.getMessage('referral.existing_code', userLanguage),
          data: {
            referral_code: activeReferral.referralCode,
            referral_link: `${process.env.APP_BASE_URL}/ref/${activeReferral.referralCode}`,
            qr_code: `data:image/svg+xml;base64,${Buffer.from(this.generateQRCodeSVG(activeReferral.referralCode)).toString('base64')}`,
            stats: {
              total_invites: existingReferrals.length,
              successful_referrals: existingReferrals.filter(ref => ref.status === 'rewarded').length,
              total_earned: existingReferrals
                .filter(ref => ref.status === 'rewarded')
                .reduce((sum, ref) => sum + parseFloat(ref.inviterReward || '0'), 0)
                .toFixed(2) + ' SAR'
            }
          }
        });
      }

      // Generate new referral code
      const user = await this.storage.getUser(userId);
      const userName = user?.name.replace(/\s+/g, '').toUpperCase().substring(0, 4) || 'USER';
      const referralCode = `${userName}${new Date().getFullYear()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Create referral record
      const referral = await this.storage.createReferral({
        inviterId: userId,
        inviteeId: null,
        referralCode,
        status: 'pending',
        inviterReward: '50.00',
        inviteeReward: '25.00'
      });

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('referral.code_generated', userLanguage),
        data: {
          referral_code: referral.referralCode,
          referral_link: `${process.env.APP_BASE_URL || 'https://cleanserve.sa'}/ref/${referral.referralCode}`,
          qr_code: `data:image/svg+xml;base64,${Buffer.from(this.generateQRCodeSVG(referral.referralCode)).toString('base64')}`,
          inviter_reward: parseFloat(referral.inviterReward || '50'),
          invitee_reward: parseFloat(referral.inviteeReward || '25'),
          stats: {
            total_invites: 0,
            successful_referrals: 0,
            total_earned: '0.00 SAR'
          }
        }
      });

    } catch (error) {
      console.error('Generate referral code error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getReferralStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const referrals = await this.storage.getUserReferrals(userId);
      const totalEarned = referrals
        .filter(ref => ref.status === 'rewarded')
        .reduce((sum, ref) => sum + parseFloat(ref.inviterReward || '0'), 0);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('referral.stats_retrieved', userLanguage),
        data: {
          total_invites: referrals.length,
          pending_invites: referrals.filter(ref => ref.status === 'pending').length,
          completed_invites: referrals.filter(ref => ref.status === 'completed').length,
          successful_referrals: referrals.filter(ref => ref.status === 'rewarded').length,
          total_earned: `${totalEarned.toFixed(2)} SAR`,
          referral_history: referrals.map(ref => ({
            id: ref.id,
            referral_code: ref.referralCode,
            status: ref.status,
            inviter_reward: parseFloat(ref.inviterReward || '0'),
            invitee_reward: parseFloat(ref.inviteeReward || '0'),
            reward_distributed_at: ref.rewardDistributedAt,
            created_at: ref.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('Get referral stats error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  private generateQRCodeSVG(text: string): string {
    // Simple QR code SVG generation (in production, use a proper QR code library)
    const size = 200;
    const modules = 25;
    const moduleSize = size / modules;
    
    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;
    
    // Generate a simple pattern based on text hash
    const hash = crypto.createHash('md5').update(text).digest('hex');
    
    for (let i = 0; i < modules; i++) {
      for (let j = 0; j < modules; j++) {
        const index = (i * modules + j) % hash.length;
        const charCode = hash.charCodeAt(index);
        
        if (charCode % 2 === 0) {
          const x = j * moduleSize;
          const y = i * moduleSize;
          svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
        }
      }
    }
    
    svg += '</svg>';
    return svg;
  }
}
