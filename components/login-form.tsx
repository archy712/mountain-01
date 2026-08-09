"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 로그인 폼 (산길정보). 스타터 패턴 유지 — Client Component 에서 `supabase.auth` 직접 호출.
 * `next` 는 로그인 성공 후 복귀 경로(기본 `/favorites`). 보호 라우트 접근 시 proxy 가
 * `?next=` 로 실어 주며, 여기서 그대로 이어받아 이동한다(Task 025).
 */
export function LoginForm({
  next = "/favorites",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(next);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "로그인에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>이메일로 로그인하고 즐겨찾기를 이용하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">비밀번호</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
              {/* 구분선은 GoogleAuthButton 이 자체 포함(미구성 시 통째로 숨김) */}
              <GoogleAuthButton next={next} label="Google로 계속하기" />
            </div>
            <div className="mt-4 text-center text-sm">
              계정이 없으신가요?{" "}
              <Link href="/auth/sign-up" className="underline underline-offset-4">
                회원가입
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
