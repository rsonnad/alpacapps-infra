import type { Dictionary } from "@/i18n/types";

export function Footer({ dict }: { dict: Dictionary }) {
  return (
    <footer className="border-t border-slate-200 py-8 px-6">
      <div className="max-w-6xl mx-auto text-center text-sm text-slate-500">
        &copy; {new Date().getFullYear()} {dict.metadata.title}. {dict.footer.rights}
      </div>
    </footer>
  );
}
