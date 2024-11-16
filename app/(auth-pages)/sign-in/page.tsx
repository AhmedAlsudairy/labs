import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";

export default function Login({ searchParams }: { searchParams: Message }) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      {/* Background image with overlay */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 w-full h-full bg-[url('/sign_in.jpeg')] bg-cover bg-center bg-no-repeat" 
             style={{ height: '100vh', width: '100vw' }} 
        />
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      </div>
      
      {/* Content */}
      <Card className="relative w-[400px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm shadow-xl transition-colors duration-300">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2 dark:text-white">
            Welcome to the Laboratory Equipment Management Platform in Oman
          </h1>
          <p className="text-sm text-muted-foreground">
            One health approach, equipment management
          </p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col">
            <div className="flex flex-col gap-2 [&>input]:mb-3">
              <Label htmlFor="email">Email</Label>
              <Input name="email" placeholder="you@example.com" required />
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  className="text-xs text-foreground underline"
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
              />
              <SubmitButton pendingText="Signing In..." formAction={signInAction}>
                Sign in
              </SubmitButton>
              <FormMessage message={searchParams} />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


