import { Badge } from "./badge";

type StateIndicatorProps = {
  state: string;
  mode: 'maintenance' | 'calibration' | 'external_control';
};

export function StateIndicator({ state, mode }: StateIndicatorProps) {
  const getStateColor = (state: string): "success" | "warning" | "destructive" | "default" => {
    if (mode === 'external_control') {
      switch (state) {
        case 'Done':
          return 'success';
        case 'Final Date':
          return 'warning';
        case 'E.Q.C  Reception':
          return 'destructive';
        default:
          return 'default';
      }
    } else {
      const variants: Record<string, "success" | "warning" | "destructive"> = {
        "done": "success",
        "calibrated": "success",
        "need maintance": "warning",
        "need calibration": "warning",
        "late maintance": "destructive",
        "late calibration": "destructive"
      };
      return variants[state.toLowerCase()] || "default";
    }
  };

  return (
    <Badge variant={getStateColor(state)}>{state}</Badge>
  );
}
