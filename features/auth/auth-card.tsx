export function AuthCard({ title, subtitle, children, footer, wide }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "w-full max-w-3xl" : "w-full max-w-[400px]"}>
      <div className="panel p-7 shadow-[var(--shadow-float)] sm:p-8">
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-chrome">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[13.5px] text-steel-400">{subtitle}</p> : null}
        <div className="mt-7">{children}</div>
      </div>
      {footer ? <div className="mt-5 text-center text-[13px] text-steel-400">{footer}</div> : null}
    </div>
  );
}
