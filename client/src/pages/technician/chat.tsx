import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TechnicianChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      toast({
        title: 'Connected',
        description: 'Real-time chat is now active',
      });
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    websocket.onerror = () => {
      toast({
        title: 'Connection error',
        description: 'Failed to connect to chat server',
        variant: 'destructive',
      });
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !ws) return;

    const message = {
      type: 'message',
      data: {
        from: userId,
        text: newMessage,
        timestamp: new Date().toISOString(),
      },
    };

    ws.send(JSON.stringify(message));
    setMessages((prev) => [...prev, { from: userId, text: newMessage, timestamp: new Date().toISOString() }]);
    setNewMessage('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-title">Customer Chat</h1>

      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Real-time Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.from === userId ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${index}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.from === userId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              data-testid="input-message"
            />
            <Button onClick={handleSendMessage} data-testid="button-send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
