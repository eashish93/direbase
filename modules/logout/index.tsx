'use client';

import { Button } from "@/elements/button";
import useAuth from "@/lib/hooks/useAuth";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const { auth } = useAuth();
  const router = useRouter();
  
  const handleLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
        location.reload();
        router.push('/admin/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };
  
  return (
    <Button 
      onClick={handleLogout} 
      variant="outline" 
      size="sm"
    >
      Logout
    </Button>
  );
} 