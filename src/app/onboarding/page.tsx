import { getProfile } from "@/backend/profile";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { getLang } from "@/i18n/server";
import { parseInterests } from "@/onboarding/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function OnboardingPage() {
  const profile = await getProfile();
  const lang = await getLang();
  return (
    <OnboardingFlow
      initial={{
        lang,
        ageGroup: profile?.ageGroup ?? null,
        education: profile?.education ?? null,
        goal: profile?.goal ?? null,
        interests: profile ? parseInterests(profile.interests) : [],
      }}
    />
  );
}
