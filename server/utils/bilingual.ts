interface BilingualMessages {
  [key: string]: {
    en: string;
    ar: string;
  };
}

const messages: BilingualMessages = {
  // Authentication messages
  'auth.token_required': {
    en: 'Authentication token required',
    ar: 'رمز المصادقة مطلوب'
  },
  'auth.token_invalid': {
    en: 'Invalid authentication token',
    ar: 'رمز المصادقة غير صحيح'
  },
  'auth.user_not_found': {
    en: 'User not found',
    ar: 'المستخدم غير موجود'
  },
  'auth.insufficient_permissions': {
    en: 'Insufficient permissions',
    ar: 'صلاحيات غير كافية'
  },
  'auth.unauthorized': {
    en: 'Unauthorized access',
    ar: 'وصول غير مصرح به'
  },
  'auth.user_already_exists': {
    en: 'User already exists with this email or phone',
    ar: 'المستخدم موجود بالفعل بهذا البريد الإلكتروني أو الهاتف'
  },
  'auth.rate_limit_exceeded': {
    en: 'Too many requests. Please try again later',
    ar: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً'
  },
  'auth.invalid_credentials': {
    en: 'Invalid email/phone or password',
    ar: 'البريد الإلكتروني/الهاتف أو كلمة المرور غير صحيحة'
  },
  'auth.account_not_verified': {
    en: 'Account not verified. Please verify your OTP',
    ar: 'الحساب غير مفعل. يرجى التحقق من رمز OTP'
  },
  'auth.otp_expired': {
    en: 'OTP has expired. Please request a new one',
    ar: 'انتهت صلاحية رمز OTP. يرجى طلب رمز جديد'
  },
  'auth.otp_max_attempts': {
    en: 'Maximum OTP attempts exceeded',
    ar: 'تم تجاوز الحد الأقصى لمحاولات OTP'
  },
  'auth.otp_invalid': {
    en: 'Invalid OTP code',
    ar: 'رمز OTP غير صحيح'
  },
  'auth.otp_resend_limit': {
    en: 'OTP resend limit exceeded. Please wait before requesting again',
    ar: 'تم تجاوز حد إعادة إرسال OTP. يرجى الانتظار قبل الطلب مرة أخرى'
  },
  'auth.otp_send_failed': {
    en: 'Failed to send OTP. Please try again',
    ar: 'فشل في إرسال رمز OTP. يرجى المحاولة مرة أخرى'
  },
  'auth.forgot_password_limit': {
    en: 'Password reset limit exceeded. Please wait before trying again',
    ar: 'تم تجاوز حد إعادة تعيين كلمة المرور. يرجى الانتظار قبل المحاولة مرة أخرى'
  },
  'auth.invalid_reset_code': {
    en: 'Invalid or expired reset code',
    ar: 'رمز إعادة التعيين غير صحيح أو منتهي الصلاحية'
  },
  'auth.invalid_refresh_token': {
    en: 'Invalid refresh token',
    ar: 'رمز التحديث غير صحيح'
  },
  'auth.access_denied': {
    en: 'Access denied',
    ar: 'تم رفض الوصول'
  },
  'auth.admin_only': {
    en: 'Admin access only',
    ar: 'وصول المشرف فقط'
  },
  'auth.technician_only': {
    en: 'Technician access only',
    ar: 'وصول الفني فقط'
  },

  // Success messages
  'auth.user_created_verify_otp': {
    en: 'Account created successfully. Please verify OTP code',
    ar: 'تم إنشاء الحساب بنجاح. يرجى التحقق من رمز OTP'
  },
  'auth.user_created_otp_failed': {
    en: 'Account created but OTP sending failed. Please try to resend OTP',
    ar: 'تم إنشاء الحساب لكن فشل إرسال OTP. يرجى إعادة إرسال OTP'
  },
  'auth.login_successful': {
    en: 'Login successful',
    ar: 'تم تسجيل الدخول بنجاح'
  },
  'auth.verification_successful': {
    en: 'Account verified successfully',
    ar: 'تم التحقق من الحساب بنجاح'
  },
  'auth.otp_resent': {
    en: 'OTP has been resent successfully',
    ar: 'تم إعادة إرسال رمز OTP بنجاح'
  },
  'auth.reset_code_sent': {
    en: 'Password reset code has been sent',
    ar: 'تم إرسال رمز إعادة تعيين كلمة المرور'
  },
  'auth.password_reset_successful': {
    en: 'Password has been reset successfully',
    ar: 'تم إعادة تعيين كلمة المرور بنجاح'
  },
  'auth.token_refreshed': {
    en: 'Token refreshed successfully',
    ar: 'تم تحديث الرمز المميز بنجاح'
  },
  'auth.logout_successful': {
    en: 'Logout successful',
    ar: 'تم تسجيل الخروج بنجاح'
  },

  // Profile messages
  'profile.retrieved_successfully': {
    en: 'Profile retrieved successfully',
    ar: 'تم استرداد الملف الشخصي بنجاح'
  },
  'profile.updated_successfully': {
    en: 'Profile updated successfully',
    ar: 'تم تحديث الملف الشخصي بنجاح'
  },

  // Address messages
  'addresses.retrieved_successfully': {
    en: 'Addresses retrieved successfully',
    ar: 'تم استرداد العناوين بنجاح'
  },
  'addresses.created_successfully': {
    en: 'Address created successfully',
    ar: 'تم إنشاء العنوان بنجاح'
  },
  'addresses.updated_successfully': {
    en: 'Address updated successfully',
    ar: 'تم تحديث العنوان بنجاح'
  },
  'addresses.deleted_successfully': {
    en: 'Address deleted successfully',
    ar: 'تم حذف العنوان بنجاح'
  },
  'addresses.not_found': {
    en: 'Address not found',
    ar: 'العنوان غير موجود'
  },
  'addresses.update_failed': {
    en: 'Failed to update address',
    ar: 'فشل في تحديث العنوان'
  },
  'addresses.delete_failed': {
    en: 'Failed to delete address',
    ar: 'فشل في حذف العنوان'
  },

  // Wallet messages
  'wallet.retrieved_successfully': {
    en: 'Wallet information retrieved successfully',
    ar: 'تم استرداد معلومات المحفظة بنجاح'
  },
  'wallet.topup_successful': {
    en: 'Wallet top-up successful',
    ar: 'تم شحن المحفظة بنجاح'
  },
  'wallet.transactions_retrieved': {
    en: 'Wallet transactions retrieved successfully',
    ar: 'تم استرداد معاملات المحفظة بنجاح'
  },
  'wallet.insufficient_balance': {
    en: 'Insufficient wallet balance',
    ar: 'رصيد المحفظة غير كافي'
  },

  // Referral messages
  'referral.existing_code': {
    en: 'Your existing referral code',
    ar: 'رمز الإحالة الحالي الخاص بك'
  },
  'referral.code_generated': {
    en: 'Referral code generated successfully',
    ar: 'تم إنشاء رمز الإحالة بنجاح'
  },
  'referral.stats_retrieved': {
    en: 'Referral statistics retrieved successfully',
    ar: 'تم استرداد إحصائيات الإحالة بنجاح'
  },

  // Services messages
  'services.categories_retrieved': {
    en: 'Service categories retrieved successfully',
    ar: 'تم استرداد فئات الخدمات بنجاح'
  },
  'services.category_retrieved': {
    en: 'Service category retrieved successfully',
    ar: 'تم استرداد فئة الخدمة بنجاح'
  },
  'services.category_not_found': {
    en: 'Service category not found',
    ar: 'فئة الخدمة غير موجودة'
  },
  'services.packages_retrieved': {
    en: 'Service packages retrieved successfully',
    ar: 'تم استرداد باقات الخدمة بنجاح'
  },
  'services.package_not_found': {
    en: 'Service package not found',
    ar: 'باقة الخدمة غير موجودة'
  },

  // Spare parts messages
  'spare_parts.retrieved_successfully': {
    en: 'Spare parts retrieved successfully',
    ar: 'تم استرداد قطع الغيار بنجاح'
  },
  'spare_parts.not_found': {
    en: 'Spare part not found',
    ar: 'قطعة الغيار غير موجودة'
  },

  // Booking messages
  'booking.available_slots_retrieved': {
    en: 'Available slots retrieved successfully',
    ar: 'تم استرداد المواعيد المتاحة بنجاح'
  },
  'booking.created_successfully': {
    en: 'Booking created successfully',
    ar: 'تم إنشاء الحجز بنجاح'
  },
  'booking.retrieved_successfully': {
    en: 'Booking retrieved successfully',
    ar: 'تم استرداد الحجز بنجاح'
  },
  'booking.not_found': {
    en: 'Booking not found',
    ar: 'الحجز غير موجود'
  },
  'booking.past_date_not_allowed': {
    en: 'Cannot book for past dates',
    ar: 'لا يمكن الحجز لتواريخ سابقة'
  },
  'booking.not_assigned': {
    en: 'Booking not assigned to you',
    ar: 'الحجز غير مخصص لك'
  },
  'booking.cannot_accept': {
    en: 'Cannot accept this booking',
    ar: 'لا يمكن قبول هذا الحجز'
  },

  // Quotation messages
  'quotation.created_successfully': {
    en: 'Quotation created successfully',
    ar: 'تم إنشاء عرض السعر بنجاح'
  },
  'quotation.not_found': {
    en: 'Quotation not found',
    ar: 'عرض السعر غير موجود'
  },
  'quotation.approved_successfully': {
    en: 'Quotation approved successfully',
    ar: 'تمت الموافقة على عرض السعر بنجاح'
  },
  'quotation.rejected_successfully': {
    en: 'Quotation rejected successfully',
    ar: 'تم رفض عرض السعر بنجاح'
  },
  'quotation.already_processed': {
    en: 'Quotation has already been processed',
    ar: 'تمت معالجة عرض السعر بالفعل'
  },

  // Order messages
  'orders.retrieved_successfully': {
    en: 'Orders retrieved successfully',
    ar: 'تم استرداد الطلبات بنجاح'
  },
  'orders.not_found': {
    en: 'Order not found',
    ar: 'الطلب غير موجود'
  },
  'orders.status_retrieved': {
    en: 'Order status retrieved successfully',
    ar: 'تم استرداد حالة الطلب بنجاح'
  },
  'orders.invoice_generated': {
    en: 'Invoice generated successfully',
    ar: 'تم إنشاء الفاتورة بنجاح'
  },
  'orders.invoice_not_available': {
    en: 'Invoice not available for this order',
    ar: 'الفاتورة غير متاحة لهذا الطلب'
  },
  'orders.invoice_generation_failed': {
    en: 'Failed to generate invoice',
    ar: 'فشل في إنشاء الفاتورة'
  },
  'orders.pdf_generation_failed': {
    en: 'Failed to generate PDF',
    ar: 'فشل في إنشاء ملف PDF'
  },
  'orders.review_submitted': {
    en: 'Review submitted successfully',
    ar: 'تم إرسال التقييم بنجاح'
  },
  'orders.review_not_allowed': {
    en: 'Review not allowed for this order',
    ar: 'التقييم غير مسموح لهذا الطلب'
  },
  'orders.already_reviewed': {
    en: 'Order has already been reviewed',
    ar: 'تم تقييم الطلب بالفعل'
  },
  'orders.reorder_successful': {
    en: 'Reorder created successfully',
    ar: 'تم إنشاء إعادة الطلب بنجاح'
  },
  'orders.technician_orders_retrieved': {
    en: 'Technician orders retrieved successfully',
    ar: 'تم استرداد طلبات الفني بنجاح'
  },
  'orders.accepted_successfully': {
    en: 'Order accepted successfully',
    ar: 'تم قبول الطلب بنجاح'
  },
  'orders.status_updated': {
    en: 'Order status updated successfully',
    ar: 'تم تحديث حالة الطلب بنجاح'
  },

  // Payment messages
  'payment.wallet_successful': {
    en: 'Wallet payment successful',
    ar: 'تم الدفع من المحفظة بنجاح'
  },
  'payment.amounts_mismatch': {
    en: 'Payment amounts do not match total',
    ar: 'مبالغ الدفع لا تتطابق مع المجموع'
  },
  'payment.gateway_failed': {
    en: 'Payment gateway processing failed',
    ar: 'فشل في معالجة بوابة الدفع'
  },
  'payment.missing_user_data': {
    en: 'Missing required user data for payment',
    ar: 'بيانات المستخدم المطلوبة للدفع مفقودة'
  },
  'payment.hybrid_created': {
    en: 'Hybrid payment created successfully',
    ar: 'تم إنشاء الدفع المختلط بنجاح'
  },
  'payment.created_successfully': {
    en: 'Payment created successfully',
    ar: 'تم إنشاء الدفع بنجاح'
  },
  'payment.creation_failed': {
    en: 'Payment creation failed',
    ar: 'فشل في إنشاء الدفع'
  },
  'payment.verification_failed': {
    en: 'Payment verification failed',
    ar: 'فشل في التحقق من الدفع'
  },
  'payment.verification_successful': {
    en: 'Payment verification successful',
    ar: 'تم التحقق من الدفع بنجاح'
  },
  'payment.not_found': {
    en: 'Payment not found',
    ar: 'الدفع غير موجود'
  },
  'payment.cannot_refund': {
    en: 'Payment cannot be refunded',
    ar: 'لا يمكن رد هذه الدفعة'
  },
  'payment.refund_failed': {
    en: 'Payment refund failed',
    ar: 'فشل في رد الدفعة'
  },
  'payment.refund_successful': {
    en: 'Payment refund successful',
    ar: 'تم رد الدفعة بنجاح'
  },
  'payment.tabby_checkout_failed': {
    en: 'Tabby checkout creation failed',
    ar: 'فشل في إنشاء دفع Tabby'
  },
  'payment.tabby_checkout_created': {
    en: 'Tabby checkout created successfully',
    ar: 'تم إنشاء دفع Tabby بنجاح'
  },
  'payment.not_eligible_bnpl': {
    en: 'Amount not eligible for Buy Now Pay Later',
    ar: 'المبلغ غير مؤهل لخدمة اشتر الآن وادفع لاحقاً'
  },
  'payment.cannot_capture': {
    en: 'Payment cannot be captured',
    ar: 'لا يمكن التقاط الدفعة'
  },
  'payment.capture_failed': {
    en: 'Payment capture failed',
    ar: 'فشل في التقاط الدفعة'
  },
  'payment.capture_successful': {
    en: 'Payment capture successful',
    ar: 'تم التقاط الدفعة بنجاح'
  },
  'payment.close_failed': {
    en: 'Payment close failed',
    ar: 'فشل في إغلاق الدفعة'
  },
  'payment.close_successful': {
    en: 'Payment close successful',
    ar: 'تم إغلاق الدفعة بنجاح'
  },

  // Notification messages
  'notifications.retrieved_successfully': {
    en: 'Notifications retrieved successfully',
    ar: 'تم استرداد الإشعارات بنجاح'
  },
  'notifications.not_found': {
    en: 'Notification not found',
    ar: 'الإشعار غير موجود'
  },
  'notifications.already_read': {
    en: 'Notification already marked as read',
    ar: 'تم وضع علامة قراءة على الإشعار بالفعل'
  },
  'notifications.mark_read_failed': {
    en: 'Failed to mark notification as read',
    ar: 'فشل في وضع علامة قراءة على الإشعار'
  },
  'notifications.marked_as_read': {
    en: 'Notification marked as read',
    ar: 'تم وضع علامة قراءة على الإشعار'
  },
  'notifications.batch_sent': {
    en: 'Batch notifications sent successfully',
    ar: 'تم إرسال الإشعارات المجمعة بنجاح'
  },

  // Support messages
  'support.ticket_created': {
    en: 'Support ticket created successfully',
    ar: 'تم إنشاء تذكرة الدعم بنجاح'
  },
  'support.tickets_retrieved': {
    en: 'Support tickets retrieved successfully',
    ar: 'تم استرداد تذاكر الدعم بنجاح'
  },
  'support.ticket_not_found': {
    en: 'Support ticket not found',
    ar: 'تذكرة الدعم غير موجودة'
  },
  'support.ticket_retrieved': {
    en: 'Support ticket retrieved successfully',
    ar: 'تم استرداد تذكرة الدعم بنجاح'
  },
  'support.message_sent': {
    en: 'Support message sent successfully',
    ar: 'تم إرسال رسالة الدعم بنجاح'
  },
  'support.messages_retrieved': {
    en: 'Support messages retrieved successfully',
    ar: 'تم استرداد رسائل الدعم بنجاح'
  },
  'support.faqs_retrieved': {
    en: 'FAQs retrieved successfully',
    ar: 'تم استرداد الأسئلة الشائعة بنجاح'
  },
  'support.all_tickets_retrieved': {
    en: 'All support tickets retrieved successfully',
    ar: 'تم استرداد جميع تذاكر الدعم بنجاح'
  },
  'support.invalid_assignee': {
    en: 'Invalid assignee for support ticket',
    ar: 'المعين غير صحيح لتذكرة الدعم'
  },
  'support.ticket_assigned': {
    en: 'Support ticket assigned successfully',
    ar: 'تم تعيين تذكرة الدعم بنجاح'
  },
  'support.ticket_status_updated': {
    en: 'Support ticket status updated successfully',
    ar: 'تم تحديث حالة تذكرة الدعم بنجاح'
  },

  // Admin messages
  'admin.service_created': {
    en: 'Service created successfully',
    ar: 'تم إنشاء الخدمة بنجاح'
  },
  'admin.service_updated': {
    en: 'Service updated successfully',
    ar: 'تم تحديث الخدمة بنجاح'
  },
  'admin.spare_part_created': {
    en: 'Spare part created successfully',
    ar: 'تم إنشاء قطعة الغيار بنجاح'
  },
  'admin.spare_part_updated': {
    en: 'Spare part updated successfully',
    ar: 'تم تحديث قطعة الغيار بنجاح'
  },
  'admin.analytics_retrieved': {
    en: 'Analytics retrieved successfully',
    ar: 'تم استرداد الإحصائيات بنجاح'
  },
  'admin.orders_retrieved': {
    en: 'Orders retrieved successfully',
    ar: 'تم استرداد الطلبات بنجاح'
  },
  'admin.users_retrieved': {
    en: 'Users retrieved successfully',
    ar: 'تم استرداد المستخدمين بنجاح'
  },
  'admin.financial_audit_retrieved': {
    en: 'Financial audit retrieved successfully',
    ar: 'تم استرداد التدقيق المالي بنجاح'
  },
  'admin.user_role_updated': {
    en: 'User role updated successfully',
    ar: 'تم تحديث دور المستخدم بنجاح'
  },
  'admin.system_health_retrieved': {
    en: 'System health retrieved successfully',
    ar: 'تم استرداد حالة النظام بنجاح'
  },
  'admin.booking_status_updated': {
    en: 'Booking status updated successfully',
    ar: 'تم تحديث حالة الحجز بنجاح'
  },
  'admin.technician_assigned': {
    en: 'Technician assigned successfully',
    ar: 'تم تعيين الفني بنجاح'
  },
  'admin.booking_cancelled': {
    en: 'Booking cancelled successfully',
    ar: 'تم إلغاء الحجز بنجاح'
  },
  'admin.payment_refunded': {
    en: 'Payment refunded successfully',
    ar: 'تم استرداد المبلغ بنجاح'
  },
  'admin.user_created': {
    en: 'User created successfully',
    ar: 'تم إنشاء المستخدم بنجاح'
  },
  'admin.user_updated': {
    en: 'User updated successfully',
    ar: 'تم تحديث المستخدم بنجاح'
  },
  'admin.user_deleted': {
    en: 'User deleted successfully',
    ar: 'تم حذف المستخدم بنجاح'
  },
  'admin.user_deletion_blocked': {
    en: 'Cannot delete user with related data',
    ar: 'لا يمكن حذف المستخدم الذي لديه بيانات مرتبطة'
  },
  'admin.user_has_bookings': {
    en: '{count} booking(s)',
    ar: '{count} حجز/حجوزات'
  },
  'admin.user_has_payments': {
    en: '{count} payment(s)',
    ar: '{count} دفعة/دفعات'
  },
  'admin.user_has_tickets': {
    en: '{count} support ticket(s)',
    ar: '{count} تذكرة/تذاكر دعم'
  },
  'admin.user_has_reviews': {
    en: '{count} review(s)',
    ar: '{count} تقييم/تقييمات'
  },
  'admin.user_has_referrals': {
    en: '{count} referral(s)',
    ar: '{count} إحالة/إحالات'
  },
  'admin.user_has_subscriptions': {
    en: '{count} subscription(s)',
    ar: '{count} اشتراك/اشتراكات'
  },
  'admin.user_has_credit_transactions': {
    en: '{count} credit transaction(s)',
    ar: '{count} معاملة/معاملات رصيد'
  },
  'admin.user_has_quotations': {
    en: '{count} quotation(s)',
    ar: '{count} عرض/عروض أسعار'
  },

  // Webhook messages
  'webhooks.history_retrieved': {
    en: 'Webhook history retrieved successfully',
    ar: 'تم استرداد تاريخ الـ webhooks بنجاح'
  },

  // Promotion messages
  'promotions.retrieved_successfully': {
    en: 'Promotions retrieved successfully',
    ar: 'تم استرداد العروض الترويجية بنجاح'
  },
  'promotions.invalid_code': {
    en: 'Invalid promotion code',
    ar: 'رمز العرض الترويجي غير صحيح'
  },
  'promotions.min_amount_required': {
    en: 'Minimum order amount required: {amount} SAR',
    ar: 'الحد الأدنى لمبلغ الطلب مطلوب: {amount} ريال'
  },
  'promotions.code_applied': {
    en: 'Promotion code applied successfully',
    ar: 'تم تطبيق رمز العرض الترويجي بنجاح'
  },

  // Validation messages
  'validation.invalid_data': {
    en: 'Invalid data provided',
    ar: 'البيانات المقدمة غير صحيحة'
  },
  'validation.no_data_provided': {
    en: 'No data provided for update',
    ar: 'لا توجد بيانات للتحديث'
  },
  'validation.required_fields': {
    en: 'Required fields are missing',
    ar: 'الحقول المطلوبة مفقودة'
  },
  'validation.identifier_required': {
    en: 'Email or phone number required',
    ar: 'البريد الإلكتروني أو رقم الهاتف مطلوب'
  },
  'validation.refresh_token_required': {
    en: 'Refresh token is required',
    ar: 'رمز التحديث مطلوب'
  },
  'validation.password_too_short': {
    en: 'Password must be at least 8 characters',
    ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
  },
  'validation.invalid_amount': {
    en: 'Invalid amount provided',
    ar: 'المبلغ المقدم غير صحيح'
  },
  'validation.invalid_payment_method': {
    en: 'Invalid payment method',
    ar: 'طريقة الدفع غير صحيحة'
  },
  'validation.invalid_payment_data': {
    en: 'Invalid payment data',
    ar: 'بيانات الدفع غير صحيحة'
  },
  'validation.date_required': {
    en: 'Date is required',
    ar: 'التاريخ مطلوب'
  },
  'validation.schedule_required': {
    en: 'Schedule date and time are required',
    ar: 'تاريخ ووقت الجدولة مطلوبان'
  },
  'validation.payment_id_required': {
    en: 'Payment ID is required',
    ar: 'معرف الدفع مطلوب'
  },
  'validation.order_id_required': {
    en: 'Order ID is required',
    ar: 'معرف الطلب مطلوب'
  },
  'validation.status_required': {
    en: 'Status is required',
    ar: 'الحالة مطلوبة'
  },
  'validation.invalid_status': {
    en: 'Invalid status provided',
    ar: 'الحالة المقدمة غير صحيحة'
  },
  'validation.user_ids_required': {
    en: 'User IDs are required',
    ar: 'معرفات المستخدمين مطلوبة'
  },
  'validation.title_body_required': {
    en: 'Title and body are required',
    ar: 'العنوان والمحتوى مطلوبان'
  },
  'validation.assigned_to_required': {
    en: 'Assignee is required',
    ar: 'المعين مطلوب'
  },
  'validation.invalid_role': {
    en: 'Invalid role provided',
    ar: 'الدور المقدم غير صحيح'
  },

  // User messages
  'user.not_found': {
    en: 'User not found',
    ar: 'المستخدم غير موجود'
  },
  'users.none_found': {
    en: 'No valid users found',
    ar: 'لم يتم العثور على مستخدمين صحيحين'
  },

  // General messages
  'general.server_error': {
    en: 'Internal server error. Please try again later',
    ar: 'خطأ في الخادم الداخلي. يرجى المحاولة لاحقاً'
  },
  
  // Profile messages
  'profile.notification_settings_retrieved': {
    en: 'Notification settings retrieved successfully',
    ar: 'تم استرجاع إعدادات الإشعارات بنجاح'
  },
  'notifications.settings_updated': {
    en: 'Notification settings updated successfully',
    ar: 'تم تحديث إعدادات الإشعارات بنجاح'
  },
  'booking.updated_successfully': {
    en: 'Booking updated successfully',
    ar: 'تم تحديث الحجز بنجاح'
  },
  'booking.cannot_edit': {
    en: 'Cannot edit booking in current status',
    ar: 'لا يمكن تعديل الحجز في الحالة الحالية'
  },
  'subscription.cancelled_successfully': {
    en: 'Subscription cancelled successfully',
    ar: 'تم إلغاء الاشتراك بنجاح'
  },
  'subscription.not_found': {
    en: 'Subscription not found',
    ar: 'الاشتراك غير موجود'
  },
  'subscription.already_cancelled': {
    en: 'Subscription is already cancelled',
    ar: 'الاشتراك ملغى بالفعل'
  },
  'referral.link_generated': {
    en: 'Referral link generated successfully',
    ar: 'تم إنشاء رابط الإحالة بنجاح'
  },
  'support.attachments_uploaded': {
    en: 'Attachments uploaded successfully',
    ar: 'تم رفع المرفقات بنجاح'
  },
  'app.config_retrieved': {
    en: 'App configuration retrieved successfully',
    ar: 'تم استرجاع إعدادات التطبيق بنجاح'
  },
  'referral.code_not_found': {
    en: 'Referral code not found',
    ar: 'رمز الإحالة غير موجود'
  },
  
  // Coupon messages
  'coupon.created_successfully': {
    en: 'Coupon created successfully',
    ar: 'تم إنشاء القسيمة بنجاح'
  },
  'coupon.updated_successfully': {
    en: 'Coupon updated successfully',
    ar: 'تم تحديث القسيمة بنجاح'
  },
  'coupon.deleted_successfully': {
    en: 'Coupon deleted successfully',
    ar: 'تم حذف القسيمة بنجاح'
  },
  'coupon.not_found': {
    en: 'Coupon not found',
    ar: 'القسيمة غير موجودة'
  },
  'coupon.code_already_exists': {
    en: 'Coupon code already exists',
    ar: 'رمز القسيمة موجود بالفعل'
  },
  'coupon.invalid': {
    en: 'Invalid or expired coupon',
    ar: 'قسيمة غير صالحة أو منتهية الصلاحية'
  },
  'coupon.expired': {
    en: 'Coupon has expired',
    ar: 'انتهت صلاحية القسيمة'
  },
  'coupon.not_active': {
    en: 'Coupon is not active',
    ar: 'القسيمة غير نشطة'
  },
  'coupon.usage_limit_reached': {
    en: 'Coupon usage limit has been reached',
    ar: 'تم الوصول إلى الحد الأقصى لاستخدام القسيمة'
  },
  'coupon.min_order_not_met': {
    en: 'Minimum order amount not met for this coupon',
    ar: 'الحد الأدنى لمبلغ الطلب غير مستوفى لهذه القسيمة'
  },
  'coupon.not_for_service': {
    en: 'Coupon is not valid for this service',
    ar: 'القسيمة غير صالحة لهذه الخدمة'
  },
  'coupon.first_time_only': {
    en: 'Coupon is only for first-time users',
    ar: 'القسيمة مخصصة للمستخدمين الجدد فقط'
  },
  'coupon.applied_successfully': {
    en: 'Coupon applied successfully',
    ar: 'تم تطبيق القسيمة بنجاح'
  },
  'coupon.list_retrieved': {
    en: 'Coupons retrieved successfully',
    ar: 'تم استرداد القسائم بنجاح'
  },
  
  // Credit messages
  'credit.insufficient_balance': {
    en: 'Insufficient credit balance',
    ar: 'رصيد غير كافٍ'
  },
  'credit.added_successfully': {
    en: 'Credit added successfully',
    ar: 'تمت إضافة الرصيد بنجاح'
  },
  'credit.deducted_successfully': {
    en: 'Credit deducted successfully',
    ar: 'تم خصم الرصيد بنجاح'
  },
  'credit.balance_retrieved': {
    en: 'Credit balance retrieved successfully',
    ar: 'تم استرداد رصيد الائتمان بنجاح'
  },
  'credit.history_retrieved': {
    en: 'Credit history retrieved successfully',
    ar: 'تم استرداد سجل الائتمان بنجاح'
  },
  'credit.welcome_bonus': {
    en: 'Welcome bonus',
    ar: 'مكافأة الترحيب'
  },
  'credit.referral_reward': {
    en: 'Referral reward',
    ar: 'مكافأة الإحالة'
  },
  'credit.loyalty_cashback': {
    en: 'Loyalty cashback',
    ar: 'استرداد نقدي للولاء'
  },
  'credit.booking_deduction': {
    en: 'Booking payment',
    ar: 'دفع الحجز'
  },
  'credit.admin_credit': {
    en: 'Admin credit adjustment',
    ar: 'تعديل رصيد من الإدارة'
  },
  'credit.expired': {
    en: 'Credit expired',
    ar: 'انتهت صلاحية الرصيد'
  },
  
  // Loyalty settings messages
  'loyalty.settings_retrieved': {
    en: 'Loyalty settings retrieved successfully',
    ar: 'تم استرداد إعدادات الولاء بنجاح'
  },
  'loyalty.settings_updated': {
    en: 'Loyalty settings updated successfully',
    ar: 'تم تحديث إعدادات الولاء بنجاح'
  }
};

class BilingualService {
  getMessage(key: string, language: string = 'en', variables?: Record<string, any>): string {
    const message = messages[key];
    if (!message) {
      return key; // Return key if message not found
    }

    const lang = language === 'ar' ? 'ar' : 'en';
    let text = message[lang] || message.en;

    // Replace variables in message
    if (variables) {
      Object.keys(variables).forEach(varKey => {
        text = text.replace(`{${varKey}}`, variables[varKey]);
      });
    }

    return text;
  }

  getErrorMessage(key: string, language: string = 'en', variables?: Record<string, any>): string {
    return this.getMessage(key, language, variables);
  }

  // Get both languages for API responses
  getBilingual(key: string, variables?: Record<string, any>) {
    const message = messages[key];
    if (!message) {
      return { en: key, ar: key };
    }

    let enText = message.en;
    let arText = message.ar;

    // Replace variables
    if (variables) {
      Object.keys(variables).forEach(varKey => {
        enText = enText.replace(`{${varKey}}`, variables[varKey]);
        arText = arText.replace(`{${varKey}}`, variables[varKey]);
      });
    }

    return { en: enText, ar: arText };
  }

  // Check if language is supported
  isLanguageSupported(language: string): boolean {
    return ['en', 'ar'].includes(language);
  }

  // Get default language
  getDefaultLanguage(): string {
    return 'en';
  }

  // Get user's preferred language from request
  getUserLanguage(acceptLanguage?: string, userLanguage?: string): string {
    if (userLanguage && this.isLanguageSupported(userLanguage)) {
      return userLanguage;
    }

    if (acceptLanguage) {
      // Parse Accept-Language header
      const languages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase());

      for (const lang of languages) {
        if (this.isLanguageSupported(lang)) {
          return lang;
        }
        
        // Check for language variants (e.g., ar-SA -> ar)
        const mainLang = lang.split('-')[0];
        if (this.isLanguageSupported(mainLang)) {
          return mainLang;
        }
      }
    }

    return this.getDefaultLanguage();
  }

  // Format currency for different languages
  formatCurrency(amount: number, currency: string = 'SAR', language: string = 'en'): string {
    if (language === 'ar') {
      return `${amount.toFixed(2)} ${currency === 'SAR' ? 'ريال' : currency}`;
    }
    return `${amount.toFixed(2)} ${currency}`;
  }

  // Format date for different languages
  formatDate(date: Date | string, language: string = 'en'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (language === 'ar') {
      return dateObj.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format time for different languages
  formatTime(time: string, language: string = 'en'): string {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    
    if (language === 'ar') {
      const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
      const period = hour24 >= 12 ? 'مساءً' : 'صباحاً';
      return `${hour12}:${minutes} ${period}`;
    }
    
    const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${period}`;
  }
}

export const bilingual = new BilingualService();
