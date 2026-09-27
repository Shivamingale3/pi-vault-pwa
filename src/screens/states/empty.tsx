// src/screens/states/empty.tsx

import type { EmptyProps } from "@/interfaces/props/app.props";


export function Empty({
  icon,
  title,
  description,
  action,
  secondary,
}: EmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-10">
      <div className="flex size-16 items-center justify-center rounded-[22px] bg-muted">
        {icon}
      </div>
      <div className="text-center">
        <div className="text-[19px] font-extrabold tracking-title text-foreground">
          {title}
        </div>
        <p className="mt-2.5 text-[13.5px] font-medium leading-[1.55] text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
      {secondary}
    </div>
  );
}
