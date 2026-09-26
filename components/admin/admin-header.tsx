export function AdminHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[24px] font-medium tracking-[-0.015em] text-chrome">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-[13px] text-steel-400">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
