"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { PersonalInfoForm } from "./_components/personal-info";
import { UploadPhotoForm } from "./_components/upload-photo";
import { PasswordChangeForm } from "./_components/password-change";
import { useTranslation } from "@/hooks/useTranslation";

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <Breadcrumb pageName={t("settings", "accountSettings") || "Account Settings"} />

      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-5 xl:col-span-3">
          <PersonalInfoForm />
          <div className="mt-8">
            <PasswordChangeForm />
          </div>
        </div>
        <div className="col-span-5 xl:col-span-2">
          <UploadPhotoForm />
        </div>
      </div>
    </div>
  );
}
