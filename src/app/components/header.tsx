
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Trophy,
  Home,
  Gavel,
  BarChart3,
  Settings,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export function AppHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const handleLogout = () => {
    signOut({ callbackUrl: "/pages/login" });
  };

  const navItems = [
    {
      path: "/pages/Dashboard",
      label: "Dashboard",
      icon: Home,
      roles: ["admin", "judge", "viewer"],
    },
    {
      path: "/pages/Judge",
      label: "Judge",
      icon: Gavel,
      roles: ["admin", "judge"],
    },
    {
      path: "/pages/Scoreboard",
      label: "Scoreboard",
      icon: BarChart3,
      roles: ["admin", "judge", "viewer"],
    },
    {
      path: "/pages/Competition",
      label: "Competitions",
      icon: Settings,
      roles: ["admin"],
    },
  ];
  const filteredNavItems = navItems.filter(
    (item) => session?.user?.role && item.roles.includes(session.user.role)
  );

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/favicon.ico"
            alt="JudgeHub Logo"
            width={40}
            height={40}
            className="mr-2 rounded"
          />
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            JudgeHub
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`flex items-center space-x-2 transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-accent hover:scale-105"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Actions */}
        <div className="flex items-center space-x-2">
          {session && (
            <>


              {/* Profile and Sign Out */}
              <div className="hidden md:flex items-center space-x-3">
                <Button
                  onClick={() => router.push("/profile")}
                  className="flex items-center hover:opacity-80 transition-opacity"
                >
                  <Image
                    src="/eventImage/userprofile.png"
                    alt="Profile"
                    width={32}
                    height={32}
                    className="rounded-full mr-2 border border-gray-200 dark:border-gray-600"
                  />
                  <span>{session.user?.name}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="hover:scale-110 transition-transform duration-200 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && session && (
        <div className="md:hidden py-4 space-y-2 animate-fade-in bg-white/80 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={`w-full justify-start space-x-2 ${
                    isActive ? "bg-primary text-primary-foreground" : ""
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium">{session.user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{session.user?.role}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start space-x-2 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}