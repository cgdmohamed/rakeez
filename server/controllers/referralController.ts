import { Request, Response } from 'express';
import { db } from '../db';
import { 
  referralCampaigns, 
  referrals, 
  users, 
  wallets,
  walletTransactions 
} from '@shared/schema';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auditService } from '../services/audit';

function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

export async function validateReferralCode(req: Request, res: Response) {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required',
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.referralCode, code),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
    }

    const activeCampaign = await db.query.referralCampaigns.findFirst({
      where: and(
        eq(referralCampaigns.isActive, true),
        lte(referralCampaigns.validFrom, new Date()),
        sql`(${referralCampaigns.validUntil} IS NULL OR ${referralCampaigns.validUntil} >= NOW())`
      ),
    });

    if (!activeCampaign) {
      return res.status(400).json({
        success: false,
        message: 'No active referral campaign available',
      });
    }

    const referralCount = await db
      .select({ count: count() })
      .from(referrals)
      .where(
        and(
          eq(referrals.inviterId, user.id),
          eq(referrals.campaignId, activeCampaign.id)
        )
      );

    const usageCount = referralCount[0]?.count || 0;

    if (usageCount >= activeCampaign.maxUsagePerUser) {
      return res.status(400).json({
        success: false,
        message: 'This referral code has reached its usage limit',
      });
    }

    let discountValue = Number(activeCampaign.inviteeDiscountValue);
    if (activeCampaign.inviteeDiscountType === 'percentage') {
      discountValue = 0;
    }

    res.json({
      success: true,
      data: {
        valid: true,
        referrer_name: user.name,
        discount_type: activeCampaign.inviteeDiscountType,
        discount_value: Number(activeCampaign.inviteeDiscountValue),
        discount_amount: discountValue,
        campaign_id: activeCampaign.id,
      },
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate referral code',
    });
  }
}

export async function redeemReferralCode(req: Request, res: Response) {
  try {
    const { code, order_amount } = req.body;
    const userId = (req as any).user.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required',
      });
    }

    const referrer = await db.query.users.findFirst({
      where: eq(users.referralCode, code),
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
    }

    if (referrer.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot use your own referral code',
      });
    }

    const existingReferral = await db.query.referrals.findFirst({
      where: and(
        eq(referrals.inviteeId, userId),
        eq(referrals.status, 'rewarded')
      ),
    });

    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: 'You have already used a referral code',
      });
    }

    const activeCampaign = await db.query.referralCampaigns.findFirst({
      where: and(
        eq(referralCampaigns.isActive, true),
        lte(referralCampaigns.validFrom, new Date()),
        sql`(${referralCampaigns.validUntil} IS NULL OR ${referralCampaigns.validUntil} >= NOW())`
      ),
    });

    if (!activeCampaign) {
      return res.status(400).json({
        success: false,
        message: 'No active referral campaign available',
      });
    }

    let discountAmount = Number(activeCampaign.inviteeDiscountValue);
    if (activeCampaign.inviteeDiscountType === 'percentage' && order_amount) {
      discountAmount = (Number(order_amount) * Number(activeCampaign.inviteeDiscountValue)) / 100;
    }

    const [referral] = await db.insert(referrals).values({
      campaignId: activeCampaign.id,
      inviterId: referrer.id,
      inviteeId: userId,
      referralCode: code,
      status: 'completed',
      inviterReward: activeCampaign.inviterReward,
      inviteeDiscount: discountAmount.toString(),
      completedAt: new Date(),
    }).returning();

    const referrerWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, referrer.id),
    });

    if (referrerWallet) {
      const newBalance = Number(referrerWallet.balance) + Number(activeCampaign.inviterReward);
      const newTotalEarned = Number(referrerWallet.totalEarned) + Number(activeCampaign.inviterReward);

      await db.update(wallets)
        .set({
          balance: newBalance.toString(),
          totalEarned: newTotalEarned.toString(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, referrerWallet.id));

      await db.insert(walletTransactions).values({
        walletId: referrerWallet.id,
        userId: referrer.id,
        type: 'credit',
        amount: activeCampaign.inviterReward,
        balanceBefore: referrerWallet.balance,
        balanceAfter: newBalance.toString(),
        description: `Referral reward from ${(req as any).user.name}`,
        descriptionAr: `مكافأة الإحالة من ${(req as any).user.name}`,
        referenceType: 'referral',
        referenceId: referral.id,
      });

      await db.update(referrals)
        .set({
          status: 'rewarded',
          rewardDistributedAt: new Date(),
        })
        .where(eq(referrals.id, referral.id));
    }

    await auditService.log({
      user_id: userId,
      action: 'REDEEM_REFERRAL',
      resource_type: 'referral',
      resource_id: referral.id,
      new_values: { referral_code: code, campaign_id: activeCampaign.id },
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Referral code applied successfully',
      data: {
        discount_amount: discountAmount,
        referral_id: referral.id,
      },
    });
  } catch (error) {
    console.error('Error redeeming referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to redeem referral code',
    });
  }
}

export async function getReferralStats(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    let user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.referralCode) {
      const newCode = generateReferralCode();
      await db.update(users)
        .set({ referralCode: newCode })
        .where(eq(users.id, userId));
      
      user.referralCode = newCode;
    }

    const referralList = await db.query.referrals.findMany({
      where: eq(referrals.inviterId, userId),
      with: {
        invitee: true,
        campaign: true,
      },
      orderBy: [desc(referrals.createdAt)],
    });

    const totalReferrals = referralList.length;
    const completedReferrals = referralList.filter(r => r.status === 'rewarded').length;
    const totalRewardsEarned = referralList
      .filter(r => r.status === 'rewarded')
      .reduce((sum, r) => sum + Number(r.inviterReward), 0);

    res.json({
      success: true,
      data: {
        referral_code: user.referralCode,
        total_referrals: totalReferrals,
        completed_referrals: completedReferrals,
        pending_referrals: totalReferrals - completedReferrals,
        total_rewards_earned: totalRewardsEarned,
        referrals: referralList.map(r => ({
          id: r.id,
          invitee_name: r.invitee?.name || 'New User',
          status: r.status,
          reward: r.inviterReward,
          created_at: r.createdAt,
          completed_at: r.completedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral stats',
    });
  }
}

export async function getAdminReferrals(req: Request, res: Response) {
  try {
    const { status, from_date, to_date, campaign_id } = req.query;

    let conditions: any[] = [];

    if (status) {
      conditions.push(eq(referrals.status, status as string));
    }

    if (campaign_id) {
      conditions.push(eq(referrals.campaignId, campaign_id as string));
    }

    if (from_date) {
      conditions.push(gte(referrals.createdAt, new Date(from_date as string)));
    }

    if (to_date) {
      conditions.push(lte(referrals.createdAt, new Date(to_date as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const referralList = await db.query.referrals.findMany({
      where: whereClause,
      with: {
        inviter: true,
        invitee: true,
        campaign: true,
      },
      orderBy: [desc(referrals.createdAt)],
      limit: 100,
    });

    const totalCount = await db
      .select({ count: count() })
      .from(referrals)
      .where(whereClause);

    const totalRewards = referralList
      .filter(r => r.status === 'rewarded')
      .reduce((sum, r) => sum + Number(r.inviterReward), 0);

    const totalDiscounts = referralList
      .reduce((sum, r) => sum + Number(r.inviteeDiscount), 0);

    res.json({
      success: true,
      data: {
        referrals: referralList.map(r => ({
          id: r.id,
          inviter: {
            id: r.inviter.id,
            name: r.inviter.name,
            email: r.inviter.email,
          },
          invitee: r.invitee ? {
            id: r.invitee.id,
            name: r.invitee.name,
            email: r.invitee.email,
          } : null,
          campaign: {
            id: r.campaign.id,
            name: r.campaign.name,
          },
          referral_code: r.referralCode,
          status: r.status,
          inviter_reward: r.inviterReward,
          invitee_discount: r.inviteeDiscount,
          created_at: r.createdAt,
          completed_at: r.completedAt,
          rewarded_at: r.rewardDistributedAt,
        })),
        total_count: totalCount[0]?.count || 0,
        total_rewards: totalRewards,
        total_discounts: totalDiscounts,
      },
    });
  } catch (error) {
    console.error('Error getting admin referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referrals',
    });
  }
}

export async function getReferralAnalytics(req: Request, res: Response) {
  try {
    const { from_date, to_date } = req.query;

    const fromDate = from_date ? new Date(from_date as string) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const toDate = to_date ? new Date(to_date as string) : new Date();

    const analyticsData = await db
      .select({
        month: sql<string>`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`,
        total_referrals: count(),
        total_rewards: sql<number>`SUM(CASE WHEN ${referrals.status} = 'rewarded' THEN CAST(${referrals.inviterReward} AS NUMERIC) ELSE 0 END)`,
        total_discounts: sql<number>`SUM(CAST(${referrals.inviteeDiscount} AS NUMERIC))`,
      })
      .from(referrals)
      .where(
        and(
          gte(referrals.createdAt, fromDate),
          lte(referrals.createdAt, toDate)
        )
      )
      .groupBy(sql`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`);

    const topReferrers = await db
      .select({
        user_id: referrals.inviterId,
        user_name: users.name,
        user_email: users.email,
        total_referrals: count(),
        total_rewards: sql<number>`SUM(CASE WHEN ${referrals.status} = 'rewarded' THEN CAST(${referrals.inviterReward} AS NUMERIC) ELSE 0 END)`,
      })
      .from(referrals)
      .innerJoin(users, eq(referrals.inviterId, users.id))
      .where(
        and(
          gte(referrals.createdAt, fromDate),
          lte(referrals.createdAt, toDate)
        )
      )
      .groupBy(referrals.inviterId, users.name, users.email)
      .orderBy(desc(count()))
      .limit(10);

    const conversionStats = await db
      .select({
        total_referrals: count(),
        completed_referrals: sql<number>`COUNT(CASE WHEN ${referrals.status} = 'completed' OR ${referrals.status} = 'rewarded' THEN 1 END)`,
        rewarded_referrals: sql<number>`COUNT(CASE WHEN ${referrals.status} = 'rewarded' THEN 1 END)`,
      })
      .from(referrals)
      .where(
        and(
          gte(referrals.createdAt, fromDate),
          lte(referrals.createdAt, toDate)
        )
      );

    const conversionRate = conversionStats[0]?.total_referrals > 0
      ? (Number(conversionStats[0].rewarded_referrals) / Number(conversionStats[0].total_referrals)) * 100
      : 0;

    res.json({
      success: true,
      data: {
        monthly_data: analyticsData,
        top_referrers: topReferrers,
        conversion_rate: conversionRate.toFixed(2),
        total_stats: {
          total_referrals: conversionStats[0]?.total_referrals || 0,
          completed_referrals: conversionStats[0]?.completed_referrals || 0,
          rewarded_referrals: conversionStats[0]?.rewarded_referrals || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error getting referral analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral analytics',
    });
  }
}

export async function createCampaign(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      inviter_reward,
      invitee_discount_type,
      invitee_discount_value,
      max_usage_per_user,
      valid_from,
      valid_until,
    } = req.body;

    if (!name || !description || !inviter_reward || !invitee_discount_type || !invitee_discount_value || !valid_from) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const [campaign] = await db.insert(referralCampaigns).values({
      name,
      description,
      inviterReward: inviter_reward,
      inviteeDiscountType: invitee_discount_type,
      inviteeDiscountValue: invitee_discount_value,
      maxUsagePerUser: max_usage_per_user || 1,
      isActive: true,
      validFrom: new Date(valid_from),
      validUntil: valid_until ? new Date(valid_until) : null,
    }).returning();

    await auditService.log({
      user_id: (req as any).user.id,
      action: 'CREATE_CAMPAIGN',
      resource_type: 'referral_campaign',
      resource_id: campaign.id,
      new_values: campaign,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
    });
  }
}

export async function updateCampaign(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const campaign = await db.query.referralCampaigns.findFirst({
      where: eq(referralCampaigns.id, id),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    const updateData: any = {};

    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.inviter_reward) updateData.inviterReward = updates.inviter_reward;
    if (updates.invitee_discount_type) updateData.inviteeDiscountType = updates.invitee_discount_type;
    if (updates.invitee_discount_value) updateData.inviteeDiscountValue = updates.invitee_discount_value;
    if (updates.max_usage_per_user) updateData.maxUsagePerUser = updates.max_usage_per_user;
    if (updates.is_active !== undefined) updateData.isActive = updates.is_active;
    if (updates.valid_from) updateData.validFrom = new Date(updates.valid_from);
    if (updates.valid_until) updateData.validUntil = new Date(updates.valid_until);

    updateData.updatedAt = new Date();

    const [updatedCampaign] = await db.update(referralCampaigns)
      .set(updateData)
      .where(eq(referralCampaigns.id, id))
      .returning();

    await auditService.log({
      user_id: (req as any).user.id,
      action: 'UPDATE_CAMPAIGN',
      resource_type: 'referral_campaign',
      resource_id: id,
      old_values: campaign,
      new_values: updatedCampaign,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: updatedCampaign,
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
    });
  }
}

export async function getCampaigns(req: Request, res: Response) {
  try {
    const { is_active } = req.query;

    let conditions: any[] = [];

    if (is_active !== undefined) {
      conditions.push(eq(referralCampaigns.isActive, is_active === 'true'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const campaigns = await db.query.referralCampaigns.findMany({
      where: whereClause,
      orderBy: [desc(referralCampaigns.createdAt)],
    });

    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const stats = await db
          .select({
            total_referrals: count(),
            total_rewards: sql<number>`SUM(CASE WHEN ${referrals.status} = 'rewarded' THEN CAST(${referrals.inviterReward} AS NUMERIC) ELSE 0 END)`,
          })
          .from(referrals)
          .where(eq(referrals.campaignId, campaign.id));

        return {
          ...campaign,
          total_referrals: stats[0]?.total_referrals || 0,
          total_rewards_distributed: stats[0]?.total_rewards || 0,
        };
      })
    );

    res.json({
      success: true,
      data: campaignsWithStats,
    });
  } catch (error) {
    console.error('Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaigns',
    });
  }
}
