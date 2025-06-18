import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  Gift,
  UserPlus
} from 'lucide-react';

interface ReferralStats {
  my_referral_code: string;
  total_referrals: number;
  referral_earnings: number;
  recent_referrals: Array<{
    referred_user: string;
    date: string;
    earnings: number;
  }>;
}


const ReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      setLoading(true);
      const data = await api.referral.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      toast({
        title: "Error",
        description: "Failed to load referral stats",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (!stats?.my_referral_code) return;
    
    try {
      await navigator.clipboard.writeText(stats.my_referral_code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-upvote-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6 text-upvote-primary" />
        <h1 className="text-3xl font-bold">Referral Program</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Referrals</p>
                <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold">${(stats?.referral_earnings || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Commission Rate</p>
                <p className="text-2xl font-bold">10%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share your referral code with friends and earn 10% of their spending!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={stats?.my_referral_code || ''}
              readOnly
              className="font-mono text-lg text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyReferralCode}
              disabled={copied}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Share this code with friends so they can enter it during signup
          </p>
        </CardContent>
      </Card>

      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            How the Referral Program Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Copy className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">1. Share Your Code</h3>
              <p className="text-sm text-gray-600">
                Share your unique referral code with friends and family
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Friend Signs Up</h3>
              <p className="text-sm text-gray-600">
                Your friend signs up with your code and gets $0.80 free credits
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">3. You Earn Commission</h3>
              <p className="text-sm text-gray-600">
                Earn 10% of all their future purchases as commission
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Program Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-600">For You</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  10% commission on all referral spending
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Unlimited earning potential
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Real-time earnings tracking
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-600">For Your Friends</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  $0.80 free credits on signup
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Equivalent to 100 free upvotes
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Instant credit activation
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralPage;