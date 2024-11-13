import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import sign_in_image from "@/assets/sign_in.jpeg";
import { Card } from "@/components/ui/card";

export default function Login({ searchParams }: { searchParams: Message }) {
  return (
    <div className="mx-auto flex bg-black/25 gap-9 min-h-[70vh] p-8 rounded-lg shadow-lg md:flex-row flex-col w-full lg:w-[1000px]">
      {/* Side Panel with Background Image and Overlay */}
      <Card
        className="relative p-6 rounded-lg flex flex-col items-center justify-center gap-4 text-center bg-cover bg-center"
        style={{
          backgroundImage: `url(${sign_in_image.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}>
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background to-muted opacity-60 rounded-lg w-full h-full"></div>
        <div className="lg:px-28 px-9">
          {/* Content */}
          <h2 className="relative text-2xl font-bold text-white z-10">
            Welcome to the Laboratory Equipment Management Platform in Oman
          </h2>
          <p className="relative text-center text-lg text-white z-10">
            One health approach, equipment management
          </p>
        </div>

        <form className="flex flex-col relative  p-4 md:p-9 justify-center bg-background rounded-lg">
          <h1 className="text-2xl font-medium">Sign in</h1>
          <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
            <Label htmlFor="email">Email</Label>
            <Input name="email" placeholder="you@example.com" required />
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
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
      </Card>
    </div>
  );
}
