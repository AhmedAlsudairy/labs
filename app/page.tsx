// File: pages/index.tsx

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BeakerIcon, ClipboardListIcon, BarChartIcon } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white">
      <main className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="text-2xl font-bold text-blue-600">YourLogo</div>
          <Link href="/sign-in" passHref>
            <Button variant="outline">Sign In</Button>
          </Link>
        </nav>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            Welcome to Our Laboratory Management System
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Streamline your lab operations, manage equipment, and boost productivity with our cutting-edge platform.
          </p>
          <Link href="/sign-in" passHref>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              Get Started
            </Button>
          </Link>
        </div>

        <section className="mt-24">
          <h2 className="text-3xl font-semibold text-center text-gray-800 mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Equipment Management', icon: BeakerIcon },
              { title: 'Maintenance Tracking', icon: ClipboardListIcon },
              { title: 'Usage Analytics', icon: BarChartIcon }
            ].map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-gray-100 py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-gray-600">
          © 2024 Your Laboratory Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}