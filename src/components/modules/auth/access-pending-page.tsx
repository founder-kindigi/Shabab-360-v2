"use client";

import { signOut } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogOut } from "lucide-react";

export function AccessPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950 dark:via-background dark:to-teal-950">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-emerald-600 text-white font-bold text-xl mb-4 shadow-lg shadow-emerald-600/25">
            S
          </div>
          <h1 className="text-2xl font-bold text-foreground">Shabab360</h1>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-950">
              <ShieldAlert className="size-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Access Pending</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                Your account is being set up. Please contact your administrator
                for access.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="gap-2"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}