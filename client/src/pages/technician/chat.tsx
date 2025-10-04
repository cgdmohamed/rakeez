import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export default function TechnicianChat() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = localStorage.getItem('user_id');
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    // Check for valid token before attempting WebSocket connection
    const token = localStorage.getItem('auth_token');
    
    // Skip WebSocket connection if no token is available
    if (!token) {
      console.log('No auth token found, skipping WebSocket connection');
      setConnected(false);
      setAuthError(true);
      return;
    }

    // Reset auth error state when token is available
    setAuthError(false);
    
    // Use WS_URL from environment, or fall back to auto-detection
    const wsBaseUrl = import.meta.env.VITE_WS_URL || (() => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws`;
    })();
    
    const wsUrl = `${wsBaseUrl}?token=${token}`;
    
    console.log('Attempting WebSocket connection to:', wsBaseUrl);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      reconnectAttemptRef.current = 0;
      toast({
        title: 'Connected',
        description: 'Real-time chat is now active',
      });
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages((prev) => [...prev, data.message]);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    websocket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      setConnected(false);

      // Check for authentication errors (code 1008 or 1002)
      if (event.code === 1008 || event.code === 1002) {
        setAuthError(true);
        console.error('WebSocket authentication failed - invalid or missing token');
        toast({
          title: 'Authentication Failed',
          description: 'Your session has expired. Please login again.',
          variant: 'destructive',
        });
        
        // Clear invalid token and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        setTimeout(() => setLocation('/login'), 2000);
        return;
      }

      // Prevent infinite retry loops
      if (reconnectAttemptRef.current >= maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        toast({
          title: 'Connection Failed',
          description: 'Unable to connect to chat server. Please refresh the page.',
          variant: 'destructive',
        });
        return;
      }

      reconnectAttemptRef.current += 1;
    };

    setWs(websocket);

    return () => {
      console.log('Cleaning up WebSocket connection');
      websocket.close();
    };
  }, []); // Empty dependency array - only connect once on mount

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
          <div className="flex items-center justify-between">
            <CardTitle>Real-time Chat</CardTitle>
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : authError ? (
                <WifiOff className="h-4 w-4 text-red-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-sm text-muted-foreground">
                {connected ? 'Connected' : authError ? 'Authentication Required' : 'Disconnected'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {authError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <WifiOff className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  You need to be logged in to use chat.
                </p>
              </div>
            </div>
          ) : (
            <>
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
                  placeholder={connected ? "Type a message..." : "Waiting for connection..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!connected}
                  data-testid="input-message"
                />
                <Button onClick={handleSendMessage} disabled={!connected} data-testid="button-send">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
