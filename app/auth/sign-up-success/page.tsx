import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">가입해 주셔서 감사해요!</CardTitle>
              <CardDescription>이메일을 확인해 주세요</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                회원가입이 완료됐어요. 로그인 전에 이메일에서 계정 인증을 마쳐 주세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
