// File: pages/index.tsx
"use client";
import React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BeakerIcon,
  ClipboardListIcon,
  BarChartIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            Welcome to Our Laboratory Management System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your lab operations, manage equipment, and boost
            productivity with our cutting-edge platform.
          </p>
          <Link href="/sign-in" passHref>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Get Started
            </Button>
          </Link>
        </div>

        <section className="mt-24">
          <h2 className="text-3xl font-semibold text-center text-foreground mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Equipment Management", icon: BeakerIcon },
              { title: "Maintenance Tracking", icon: ClipboardListIcon },
              { title: "Usage Analytics", icon: BarChartIcon },
            ].map((feature, index) => (
              <Card key={index} className="bg-card">
                <CardHeader>
                  <feature.icon className="w-12 h-12 text-primary mb-4" />
                  <CardTitle className="text-card-foreground">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-card-foreground/60">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                    do eiusmod tempor incididunt ut labore et dolore magna
                    aliqua.
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-muted py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          © 2024 Your Laboratory Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
