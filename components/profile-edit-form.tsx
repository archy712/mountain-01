"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  AVATAR_ICONS,
  BIO_MAX_LENGTH,
  EXPERIENCE_LEVELS,
  isExperienceLevel,
  normalizeAvatarIcon,
} from "@/lib/profile/profile-options";
import type { Tables } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Profile = Pick<
  Tables<"profiles">,
  | "id"
  | "email"
  | "username"
  | "full_name"
  | "avatar_icon"
  | "bio"
  | "favorite_mountain_id"
  | "home_region"
  | "experience_level"
>;

type MountainOption = { id: string; name: string; region: string };

const fieldClass =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * 프로필 편집 폼 (마이페이지, 본인만 접근). 스타터 폼과 동일하게 Client Component 에서
 * `supabase` 를 직접 호출한다. 아바타는 이미지 대신 **프리셋 아이콘 선택**, 그 외 이름·닉네임·
 * 자기소개·가장 좋아하는 산·주 활동 지역·등산 경력을 저장한다. RLS 로 본인 행만 수정된다.
 * 저장은 upsert(행이 없어도 안전)하고, 닉네임 중복(23505)은 친절한 메시지로 처리한다.
 */
export function ProfileEditForm({
  profile,
  mountains,
}: {
  profile: Profile;
  mountains: MountainOption[];
}) {
  const [avatarIcon, setAvatarIcon] = useState<string | null>(
    normalizeAvatarIcon(profile.avatar_icon),
  );
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [favoriteMountainId, setFavoriteMountainId] = useState(profile.favorite_mountain_id ?? "");
  const [homeRegion, setHomeRegion] = useState(profile.home_region ?? "");
  const [experience, setExperience] = useState(profile.experience_level ?? "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: profile.id,
          full_name: fullName.trim() || null,
          username: username.trim() || null,
          avatar_icon: normalizeAvatarIcon(avatarIcon),
          bio: bio.trim() || null,
          favorite_mountain_id: favoriteMountainId || null,
          home_region: homeRegion.trim() || null,
          experience_level: isExperienceLevel(experience) ? experience : null,
        },
        { onConflict: "id" },
      );
      if (error) {
        // 23505: username unique 위반 → 친절한 안내.
        if (error.code === "23505") {
          setError("이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.");
          return;
        }
        throw error;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* 프로필 아이콘 선택 */}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">프로필 아이콘</legend>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_ICONS.map(({ icon, label }) => {
            const selected = avatarIcon === icon;
            return (
              <button
                key={icon}
                type="button"
                onClick={() => setAvatarIcon(selected ? null : icon)}
                aria-pressed={selected}
                aria-label={label}
                title={label}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border text-2xl transition-colors",
                  selected
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "border-input hover:bg-accent",
                )}
              >
                <span aria-hidden="true">{icon}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {avatarIcon
            ? "다시 누르면 선택이 해제돼요(이름 이니셜로 표시)."
            : "선택하지 않으면 이름 이니셜로 표시돼요."}
        </p>
      </fieldset>

      {/* 이름 */}
      <div className="grid gap-2">
        <Label htmlFor="full-name">이름</Label>
        <Input
          id="full-name"
          type="text"
          value={fullName}
          maxLength={40}
          placeholder="예: 김산길"
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      {/* 닉네임 */}
      <div className="grid gap-2">
        <Label htmlFor="username">닉네임</Label>
        <Input
          id="username"
          type="text"
          value={username}
          maxLength={20}
          placeholder="표시용 닉네임(중복 불가)"
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      {/* 자기소개 */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="bio">자기소개</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {bio.length}/{BIO_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="bio"
          value={bio}
          maxLength={BIO_MAX_LENGTH}
          rows={3}
          placeholder="어떤 산행을 좋아하는지 소개해 보세요."
          onChange={(e) => setBio(e.target.value)}
          className={cn(fieldClass, "min-h-[80px] resize-y")}
        />
      </div>

      {/* 가장 좋아하는 산 */}
      <div className="grid gap-2">
        <Label htmlFor="favorite-mountain">가장 좋아하는 산</Label>
        <select
          id="favorite-mountain"
          value={favoriteMountainId}
          onChange={(e) => setFavoriteMountainId(e.target.value)}
          className={cn(fieldClass, "h-11")}
        >
          <option value="">선택 안 함</option>
          {mountains.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.region}
            </option>
          ))}
        </select>
      </div>

      {/* 주 활동 지역 */}
      <div className="grid gap-2">
        <Label htmlFor="home-region">주 활동 지역</Label>
        <Input
          id="home-region"
          type="text"
          value={homeRegion}
          maxLength={30}
          placeholder="예: 서울·경기"
          onChange={(e) => setHomeRegion(e.target.value)}
        />
      </div>

      {/* 등산 경력 */}
      <div className="grid gap-2">
        <Label htmlFor="experience">등산 경력</Label>
        <select
          id="experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          className={cn(fieldClass, "h-11")}
        >
          <option value="">선택 안 함</option>
          {EXPERIENCE_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-sm text-status-open">
          프로필이 저장되었어요.
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={isLoading}>
        {isLoading ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
