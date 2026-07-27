"use client";

import { signOut } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogOut } from "lucide-react";
import { motion } from "framer-motion";

export function MobileAccessPendingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm text-center space-y-8"
      >
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4B0A8F] to-[#8A40B0] text-white font-bold text-2xl mb-4 shadow-xl">
            S
          </div>
          <h1 className="text-2xl font-bold text-foreground">Shabab360</h1>
        </div>

        <Card className="border rounded-2xl shadow-sm bg-card">
          <CardContent className="flex flex-col items-center gap-5 pt-8 pb-8 px-6">
            <div className="rounded-full bg-amber-100 dark:bg-amber-950/50 p-5 ring-8 ring-amber-50 dark:ring-amber-950/20">
              <ShieldAlert className="w-10 h-10 text-amber-600 dark:text-amber-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Access Pending</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your account is currently pending approval. Please contact your administrator to grant you access to the system.
              </p>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full h-12 rounded-xl mt-4 border-2 font-semibold hover:bg-muted"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </motion.div>
      <div className="h-6" />
    </div>
  );
}
