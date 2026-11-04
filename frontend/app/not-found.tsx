import Link from "next/link";
import { getLocale } from "@/lib/locale.server";
import { t } from "@/lib/i18n";

export default async function NotFound() {
  const locale = await getLocale();
  return (
    <div className="card mx-auto mt-12 max-w-md p-8 text-center">
      <p className="text-sm text-muted">{t(locale, "notFound.title")}</p>
      <Link href="/" className="focus-ring mt-4 inline-block rounded-lg text-sm font-semibold text-accent hover:text-accent-ink">
        {t(locale, "notFound.home")}
      </Link>
    </div>
  );
}
