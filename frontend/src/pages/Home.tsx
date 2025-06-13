
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight,
  ArrowUp,
  BarChart3,
  Clock,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

const Home: React.FC = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                <span className="text-upvote-primary">Boost</span> Your Reddit Presence
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8">
                Increase visibility and engagement on your Reddit posts with our reliable upvote service. Get real upvotes from authentic accounts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute -z-10 w-3/4 h-3/4 bg-upvote-primary/20 rounded-full blur-3xl top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 transform rotate-3">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="gradient-primary text-white font-bold rounded-md p-2">
                      <ArrowUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">r/askreddit</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Posted by u/redditpro</p>
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
                    What's the most interesting fact you know?
                  </h4>
                  
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-1 text-upvote-primary">
                      <ArrowUp className="h-4 w-4" />
                      <span className="font-medium">1.4k</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">214 comments</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Share</div>
                  </div>
                </div>
                
                <div className="absolute top-20 -right-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-gray-700 w-40 transform -rotate-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-white">Upvotes</span>
                    <span className="text-upvote-primary font-semibold">+24%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-upvote-primary rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Why Choose <span className="text-upvote-primary">UpvoteHub</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              We provide top-quality Reddit upvote services that help your content gain visibility and credibility.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <ArrowUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Real Upvotes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  All upvotes come from real Reddit accounts with history and karma, ensuring they look natural and won't trigger spam filters.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor your orders in real-time and see how they impact your post's performance with our detailed analytics.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Fast Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Orders start processing immediately and are delivered at a natural pace to maintain authenticity.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Safe & Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your information is protected with enterprise-grade security, and our methods comply with Reddit's guidelines.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Simple, Transparent <span className="text-upvote-primary">Pricing</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Pay only for what you need with our credit-based system. No hidden fees or subscriptions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-2 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$10</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">/ 100 credits</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>10 upvotes per post</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>Basic analytics</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">
                  Get Started
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-upvote-primary relative md:scale-105 shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-upvote-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$25</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">/ 300 credits</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>30 upvotes per post</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>Detailed analytics</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>Auto-scheduling</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">
                  Get Started
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$50</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">/ 700 credits</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>Unlimited upvotes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>24/7 dedicated support</span>
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="mr-2 text-upvote-success" />
                    <span>API access</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Frequently Asked <span className="text-upvote-primary">Questions</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Find answers to common questions about our services.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <FaqItem 
              question="Is using UpvoteHub against Reddit's rules?"
              answer="Our service uses real Reddit accounts to provide upvotes in a natural, organic way. We carefully follow Reddit's guidelines by ensuring votes are delivered gradually and authentically."
            />
            <FaqItem 
              question="How quickly will I see results?"
              answer="Orders begin processing immediately. Upvotes are delivered gradually over a period of time to maintain the natural appearance of organic engagement. You'll see initial activity within 1-2 hours of placing your order."
            />
            <FaqItem 
              question="What payment methods do you accept?"
              answer="We accept all major credit cards, PayPal, and various cryptocurrencies for your convenience and privacy."
            />
            <FaqItem 
              question="Can I get a refund if I'm not satisfied?"
              answer="Yes, we offer a satisfaction guarantee. If your order doesn't deliver as promised, we'll either refund your credits or reprocess the order at no additional cost."
            />
            <FaqItem 
              question="How do you ensure the safety of my Reddit account?"
              answer="We never request access to your Reddit account. Our service only requires the URL of the post you want to promote. All upvotes come from established accounts with varied IP addresses and natural usage patterns."
            />
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-upvote-primary bg-opacity-10">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
            Ready to <span className="text-upvote-primary">Boost</span> Your Reddit Presence?
          </h2>
          <p className="text-lg mb-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join thousands of satisfied users who have improved their Reddit visibility with UpvoteHub.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup">
              <Button size="lg">
                Get Started Now
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Login to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

// Helper components
const CheckIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        className="flex justify-between items-center w-full px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{question}</h3>
        <ChevronIcon isOpen={isOpen} />
      </button>
      
      {isOpen && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-300">{answer}</p>
        </div>
      )}
    </div>
  );
};

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default Home;
