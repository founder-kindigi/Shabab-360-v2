import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userHasCapability } from "@/lib/auth/capability-access";
import { isHqRole } from "@/lib/auth/scope";
import nextDynamic from "next/dynamic";

const ProfileClient = nextDynamic(() => import("./_client"));

export default async function ExtendedProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ participantId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { participantId } = await params;
  const search = await searchParams;
  const cityId = search.cityId as string | undefined;

  const session = await getServerSession(authOptions);
  const user = session?.user;

  const capabilities = {
    canView: user ? await userHasCapability(user, "students.profile.view") : false,
    canManage: user ? await userHasCapability(user, "students.profile.manage") : false,
    canViewSensitive: user ? await userHasCapability(user, "students.profile.sensitive.view") : false,
    canManageSensitive: user ? await userHasCapability(user, "students.profile.sensitive.manage") : false,
  };

  const isHq = user ? isHqRole(user.role) : false;

  return (
    <ProfileClient
      participantId={participantId}
      capabilities={capabilities}
      isHqRole={isHq}
      cityId={cityId}
    />
  );
}
