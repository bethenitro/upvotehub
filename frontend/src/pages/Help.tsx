import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, Copy } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const Help: React.FC = () => {
  const telegramId = '@upvotehub_support';
  const email = 'support@upvotehub.com';

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    });
  };

  const openTelegram = () => {
    window.open(`https://t.me/${telegramId.replace('@', '')}`, '_blank');
  };

  const openEmail = () => {
    window.open(`mailto:${email}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Help & Support</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Need assistance? Get in touch with our support team through any of the methods below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Support */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Telegram Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Get instant support through our Telegram channel
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <span className="font-mono text-lg text-gray-900 dark:text-white">{telegramId}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(telegramId, 'Telegram ID')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={openTelegram}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Open Telegram
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(telegramId, 'Telegram ID')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Support */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Email Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Send us an email for detailed inquiries and support
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <span className="font-mono text-lg text-gray-900 dark:text-white">{email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(email, 'Email address')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={openEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(email, 'Email address')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Support Hours & Response Times</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Telegram Support</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Available 24/7</li>
                <li>• Average response time: 5-15 minutes</li>
                <li>• Best for urgent issues and quick questions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Email Support</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Business hours: 9 AM - 6 PM UTC</li>
                <li>• Average response time: 2-4 hours</li>
                <li>• Best for detailed inquiries and documentation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Before You Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            For faster resolution, please include the following information when contacting support:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li>• Your account email address</li>
            <li>• Order ID (if applicable)</li>
            <li>• Detailed description of the issue</li>
            <li>• Screenshots (if relevant)</li>
            <li>• Steps you've already tried</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
