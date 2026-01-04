import { Button } from "@/components/ui/button";
import { useViewMode } from "@/hooks/useViewMode";
import { Users, Shield, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ViewModeToggle() {
  const { isEmployeeViewMode, toggleViewMode } = useViewMode();

  return (
    <Button
      onClick={toggleViewMode}
      variant={isEmployeeViewMode ? "default" : "outline"}
      className={cn(
        "gap-2 transition-all duration-300",
        isEmployeeViewMode && "bg-primary text-primary-foreground shadow-lg"
      )}
    >
      <ArrowLeftRight className="w-4 h-4" />
      {isEmployeeViewMode ? (
        <>
          <Shield className="w-4 h-4" />
          <span className="hidden sm:inline">Tryb Zarządu</span>
        </>
      ) : (
        <>
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Tryb Użytkownika</span>
        </>
      )}
    </Button>
  );
}
