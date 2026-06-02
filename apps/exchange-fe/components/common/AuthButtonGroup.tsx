"use client";

import { useState } from "react";

import AuthDialog from "@/components/common/AuthDialog";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

type AuthMode = "signin" | "signup";

export default function AuthButtonGroup() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const signOut = useAuthStore((state) => state.signOut);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");

  if (isAuthenticated) {
    return (
      <Button variant="outline" size="sm" onClick={signOut}>
        Log Out
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex gap-1">
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            onClick={() => setMode("signin")}
          >
            Log In
          </Button>
        </DialogTrigger>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            onClick={() => setMode("signup")}
          >
            Sign Up
          </Button>
        </DialogTrigger>
      </div>
      <AuthDialog mode={mode} onModeChange={setMode} onOpenChange={setOpen} />
    </Dialog>
  );
}
