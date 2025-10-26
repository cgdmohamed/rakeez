import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ListIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  service: {
    name: { en: string; ar: string };
  };
  technician?: {
    id: string;
    fullName: string;
  };
  customer?: {
    id: string;
    fullName: string;
  };
}

interface BookingCalendarProps {
  bookings: Booking[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
  language?: 'en' | 'ar';
}

const statusColors: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
  pending: { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Pending', labelAr: 'قيد الانتظار' },
  confirmed: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Confirmed', labelAr: 'مؤكد' },
  technician_assigned: { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Assigned', labelAr: 'تم التعيين' },
  en_route: { bg: 'bg-indigo-500', text: 'text-indigo-500', label: 'En Route', labelAr: 'في الطريق' },
  in_progress: { bg: 'bg-orange-500', text: 'text-orange-500', label: 'In Progress', labelAr: 'قيد التنفيذ' },
  quotation_pending: { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Quotation', labelAr: 'عرض سعر' },
  completed: { bg: 'bg-green-500', text: 'text-green-500', label: 'Completed', labelAr: 'مكتمل' },
  cancelled: { bg: 'bg-red-500', text: 'text-red-500', label: 'Cancelled', labelAr: 'ملغي' },
};

export function BookingCalendar({ bookings, onDateSelect, selectedDate, language = 'en' }: BookingCalendarProps) {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.scheduledDate), date)
    );
  };

  const renderDayContent = (date: Date) => {
    const dayBookings = getBookingsForDate(date);
    if (dayBookings.length === 0) return null;

    const statusCounts: Record<string, number> = {};
    dayBookings.forEach(booking => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    });

    return (
      <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              statusColors[status]?.bg || 'bg-gray-500'
            )}
            title={`${count} ${statusColors[status]?.label || status}`}
          />
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const timeSlots = Array.from({ length: 11 }, (_, i) => 8 + i); // 8am to 6pm

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart), 'MMM d, yyyy')}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              data-testid="button-prev-week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              data-testid="button-today"
            >
              {language === 'ar' ? 'اليوم' : 'Today'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              data-testid="button-next-week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-8 border-b bg-muted">
            <div className="p-2 text-sm font-medium border-r">
              {language === 'ar' ? 'الوقت' : 'Time'}
            </div>
            {weekDays.map(day => (
              <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0">
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
              </div>
            ))}
          </div>
          <div className="divide-y">
            {timeSlots.map(hour => (
              <div key={hour} className="grid grid-cols-8 min-h-[60px]">
                <div className="p-2 text-sm text-muted-foreground border-r">
                  {hour}:00
                </div>
                {weekDays.map(day => {
                  const dayBookings = getBookingsForDate(day).filter(booking => {
                    const bookingHour = parseInt(booking.scheduledTime.split(':')[0]);
                    return bookingHour === hour;
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className="p-1 border-r last:border-r-0 cursor-pointer hover:bg-accent/50"
                      onClick={() => onDateSelect(day)}
                      data-testid={`week-cell-${format(day, 'yyyy-MM-dd')}-${hour}`}
                    >
                      {dayBookings.map(booking => (
                        <div
                          key={booking.id}
                          className={cn(
                            'text-xs p-1 rounded mb-1 truncate',
                            statusColors[booking.status]?.bg || 'bg-gray-500',
                            'text-white'
                          )}
                          title={`${booking.scheduledTime} - ${booking.service.name.en}`}
                        >
                          {booking.scheduledTime}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
            data-testid="button-month-view"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'الشهر' : 'Month'}
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
            data-testid="button-week-view"
          >
            <ListIcon className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'الأسبوع' : 'Week'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(statusColors).map(([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded-full', config.bg)} />
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? config.labelAr : config.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {view === 'month' ? (
        <Card className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date) => date && onDateSelect(date)}
            month={currentDate}
            onMonthChange={setCurrentDate}
            modifiers={{
              hasBookings: (date) => getBookingsForDate(date).length > 0,
            }}
            modifiersClassNames={{
              hasBookings: 'font-bold',
            }}
            components={{
              DayContent: ({ date }) => (
                <div className="relative w-full">
                  <div>{format(date, 'd')}</div>
                  {renderDayContent(date)}
                </div>
              ),
            }}
          />
        </Card>
      ) : (
        renderWeekView()
      )}
    </div>
  );
}
