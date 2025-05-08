'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/elements/button';
import { TextField } from '@/elements/textfield';
import { z } from 'zod';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { completeOwnerSetup } from '@/lib/actions/adminSetup';

/*
 this is first time signup page for owner. Will be visible only once on first time signup.
 Once owner signed up, it will redirect to /admin.
*/

// Define the Zod schema for form validation
const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Email is invalid'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Type inference from the schema
type SignupFormData = z.infer<typeof signupSchema>;

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Updated method to handle TextField value changes
  const handleTextFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      // Validate the form data using the Zod schema
      signupSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to our error format
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Initialize Firebase Auth client instance
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = cred.user;

      // 2. Call the Server Action to set claim and mark setup complete
      const actionResult = await completeOwnerSetup(user.uid);

      if (!actionResult.success) {
        console.error('Server Action Error completing setup:', actionResult.message);
        setErrors({ form: actionResult.message || 'Failed to complete setup process.' });
        // Optional: Consider deleting the Firebase user if the action fails. Requires Admin SDK privileges in an action/API.
        setIsLoading(false);
        return;
      }

      // 3. Redirect to login page on success
      router.push('/admin/login');
    } catch (error: any) {
      console.error('Registration or setup failed:', error);
      let errorMessage = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already registered.';
        setErrors({ email: errorMessage });
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
        setErrors({ password: errorMessage });
      } else {
        // Check if it's an error from the action itself if not caught above
        setErrors({ form: error.message || errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your admin account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            This is the first-time setup for your backend application
          </p>
        </div>

        <form className="mt-8 space-y-6 " onSubmit={handleSubmit}>
          <div className="space-y-4">
            {errors.form && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{errors.form}</div>
            )}

            <TextField
              id="name"
              name="name"
              isRequired
              value={formData.name}
              onChange={(value) => handleTextFieldChange('name', value as string)}
              label="Full Name"
              errorMessage={errors.name}
            />

            <TextField
              id="email"
              name="email"
              isRequired
              value={formData.email}
              onChange={(value) => handleTextFieldChange('email', value as string)}
              label="Email address"
              errorMessage={errors.email}
            />

            <TextField
              id="password"
              name="password"
              type="password"
              isRequired
              value={formData.password}
              onChange={(value) => handleTextFieldChange('password', value as string)}
              label="Password"
              errorMessage={errors.password}
            />
          </div>

          <div>
            <Button type="submit" variant="filled" isLoading={isLoading} className="w-full">
              Create Admin Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
