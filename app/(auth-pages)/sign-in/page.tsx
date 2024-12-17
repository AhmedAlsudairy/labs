import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";

export default function Login({ searchParams }: { searchParams: Message }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="fixed inset-0 -z-10">
        <div 
          className="absolute inset-0 w-full h-full bg-[url('/sign_in.jpeg')] bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ minHeight: '100vh' }} 
        />
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      </div>
      
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 p-4">
        {/* Information Panel */}
        <div className="w-full max-w-[600px] text-white">
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Laboratory Equipment Management Platform in Oman</h2>
            <p className="mb-4">A comprehensive solution supporting human, animal, and food laboratories in Oman.</p>
            
            <h3 className="text-xl font-semibold mb-2">Key Benefits:</h3>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li>Compliance with ISO 17025 Standards</li>
              <li>Automated Maintenance & Calibration</li>
              <li>EQC Integration</li>
              <li>Downtime Reporting</li>
              <li>Supervisors' Dashboard</li>
            </ul>

            <div className="mt-6 text-right" dir="rtl">
              <h2 className="text-2xl font-bold mb-4">منصة إدارة المعدات المخبرية في عُمان</h2>
              <p className="mb-4">حل شامل يدعم مختبرات الإنسان والحيوان والغذاء في عُمان</p>
              
              <div className="mt-4">
                <p>للتواصل:</p>
                <p>WhatsApp: 93643814</p>
                <p>Email: Micronboy632@gmail.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-[400px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl transition-colors duration-300">
          <CardHeader className="text-center p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2 dark:text-white">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Access your laboratory management dashboard
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form className="flex flex-col">
              <div className="flex flex-col gap-2 [&>input]:mb-3">
                <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                <Input 
                  name="email" 
                  placeholder="you@example.com" 
                  required 
                  className="w-full"
                />
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                  <Link
                    className="text-xs sm:text-sm text-foreground underline"
                    href="/forgot-password"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  type="password"
                  name="password"
                  placeholder="Your password"
                  required
                  className="w-full"
                />
                <SubmitButton 
                  pendingText="Signing In..." 
                  formAction={signInAction}
                  className="w-full"
                >
                  Sign in
                </SubmitButton>
                <FormMessage message={searchParams} />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
