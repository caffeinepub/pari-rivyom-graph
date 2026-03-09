import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Point, Region } from "../backend.d";
import {
  useAddPoint,
  useAddRegion,
  useDeletePoint,
  useDeleteRegion,
} from "../hooks/useQueries";
import { LABEL_COLORS } from "./CartesianGraph";

// ─── Colour swatch picker ──────────────────────────────────────────────────

function ColourSwatchPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (colour: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {LABEL_COLORS.map((colour, i) => (
        <button
          key={colour}
          type="button"
          data-ocid={`edit.colour.swatch.${i + 1}`}
          onClick={() => onSelect(colour)}
          aria-label={`Select colour ${i + 1}`}
          style={{ backgroundColor: colour }}
          className={[
            "w-6 h-6 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected === colour
              ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
              : "hover:scale-110 opacity-80 hover:opacity-100",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Edit Point Dialog ─────────────────────────────────────────────────────

function EditPointDialog({
  point,
  currentColour,
  open,
  onOpenChange,
  onSetPointColour,
}: {
  point: Point;
  currentColour: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetPointColour: (id: string, colour: string) => void;
}) {
  const [name, setName] = useState(point.name);
  const [x, setX] = useState(String(point.x));
  const [y, setY] = useState(String(point.y));
  const [colour, setColour] = useState(currentColour);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deletePoint = useDeletePoint();
  const addPoint = useAddPoint();

  const isPending = deletePoint.isPending || addPoint.isPending;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    const xn = Number.parseFloat(x);
    const yn = Number.parseFloat(y);
    if (x === "" || Number.isNaN(xn)) e.x = "Enter a number";
    else if (xn < -10 || xn > 10) e.x = "Must be -10 to 10";
    if (y === "" || Number.isNaN(yn)) e.y = "Enter a number";
    else if (yn < -10 || yn > 10) e.y = "Must be -10 to 10";
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await deletePoint.mutateAsync(point.id);
      const newId = await addPoint.mutateAsync({
        name: name.trim(),
        x: Number.parseFloat(x),
        y: Number.parseFloat(y),
      });
      onSetPointColour(newId.toString(), colour);
      toast.success(`Point "${name.trim()}" updated`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to update point");
    }
  };

  // Reset fields when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(point.name);
      setX(String(point.x));
      setY(String(point.y));
      setColour(currentColour);
      setErrors({});
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-ocid="edit.point.dialog" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Edit Point
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Name */}
          <div className="space-y-1">
            <Label
              htmlFor="edit-point-name"
              className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
            >
              Name
            </Label>
            <Input
              id="edit-point-name"
              data-ocid="edit.point.name_input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Point name"
              className="h-8 text-sm bg-muted/50 border-border/60 focus-visible:ring-ring/50"
            />
            {errors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* X / Y */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label
                htmlFor="edit-point-x"
                className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
              >
                X
              </Label>
              <Input
                id="edit-point-x"
                data-ocid="edit.point.x_input"
                type="number"
                step="0.1"
                min="-10"
                max="10"
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="0"
                className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
              />
              {errors.x && (
                <p className="text-xs text-destructive">{errors.x}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="edit-point-y"
                className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
              >
                Y
              </Label>
              <Input
                id="edit-point-y"
                data-ocid="edit.point.y_input"
                type="number"
                step="0.1"
                min="-10"
                max="10"
                value={y}
                onChange={(e) => setY(e.target.value)}
                placeholder="0"
                className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
              />
              {errors.y && (
                <p className="text-xs text-destructive">{errors.y}</p>
              )}
            </div>
          </div>

          {/* Colour */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Colour
            </Label>
            <ColourSwatchPicker selected={colour} onSelect={setColour} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            data-ocid="edit.point.cancel_button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="edit.point.save_button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : null}
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Region Dialog ────────────────────────────────────────────────────

function EditRegionDialog({
  region,
  currentColour,
  open,
  onOpenChange,
  onSetRegionColour,
}: {
  region: Region;
  currentColour: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetRegionColour: (id: string, colour: string) => void;
}) {
  const [name, setName] = useState(region.name);
  const [x, setX] = useState(String(region.x));
  const [y, setY] = useState(String(region.y));
  const [w, setW] = useState(String(region.width));
  const [h, setH] = useState(String(region.height));
  const [colour, setColour] = useState(currentColour);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deleteRegion = useDeleteRegion();
  const addRegion = useAddRegion();

  const isPending = deleteRegion.isPending || addRegion.isPending;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    const xn = Number.parseFloat(x);
    const yn = Number.parseFloat(y);
    const wn = Number.parseFloat(w);
    const hn = Number.parseFloat(h);
    if (x === "" || Number.isNaN(xn)) e.x = "Enter a number";
    else if (xn < -10 || xn > 10) e.x = "Must be -10 to 10";
    if (y === "" || Number.isNaN(yn)) e.y = "Enter a number";
    else if (yn < -10 || yn > 10) e.y = "Must be -10 to 10";
    if (w === "" || Number.isNaN(wn)) e.w = "Enter a number";
    else if (wn <= 0) e.w = "Must be positive";
    if (h === "" || Number.isNaN(hn)) e.h = "Enter a number";
    else if (hn <= 0) e.h = "Must be positive";
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await deleteRegion.mutateAsync(region.id);
      const newId = await addRegion.mutateAsync({
        name: name.trim(),
        x: Number.parseFloat(x),
        y: Number.parseFloat(y),
        width: Number.parseFloat(w),
        height: Number.parseFloat(h),
      });
      onSetRegionColour(newId.toString(), colour);
      toast.success(`Region "${name.trim()}" updated`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to update region");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(region.name);
      setX(String(region.x));
      setY(String(region.y));
      setW(String(region.width));
      setH(String(region.height));
      setColour(currentColour);
      setErrors({});
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-ocid="edit.region.dialog" className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Edit Region
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Name */}
          <div className="space-y-1">
            <Label
              htmlFor="edit-region-name"
              className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
            >
              Name
            </Label>
            <Input
              id="edit-region-name"
              data-ocid="edit.region.name_input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Region name"
              className="h-8 text-sm bg-muted/50 border-border/60 focus-visible:ring-ring/50"
            />
            {errors.name && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* X / Y */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label
                htmlFor="edit-region-x"
                className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
              >
                Center X
              </Label>
              <Input
                id="edit-region-x"
                data-ocid="edit.region.x_input"
                type="number"
                step="0.1"
                min="-10"
                max="10"
                value={x}
                onChange={(e) => setX(e.target.value)}
                placeholder="0"
                className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
              />
              {errors.x && (
                <p className="text-xs text-destructive">{errors.x}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="edit-region-y"
                className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
              >
                Center Y
              </Label>
              <Input
                id="edit-region-y"
                data-ocid="edit.region.y_input"
                type="number"
                step="0.1"
                min="-10"
                max="10"
                value={y}
                onChange={(e) => setY(e.target.value)}
                placeholder="0"
                className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
              />
              {errors.y && (
                <p className="text-xs text-destructive">{errors.y}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="edit-region-w"
                className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
              >
                Width
              </Label>
              <Input
                id="edit-region-w"
                data-ocid="edit.region.width_input"
                type="number"
                step="0.1"
                min="0.1"
                value={w}
                onChange={(e) => setW(e.target.value)}
                placeholder="4"
                className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
              />
              {errors.w && (
                <p className="text-xs text-destructive">{errors.w}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="edit-region-h"
                className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
              >
                Height
              </Label>
              <Input
                id="edit-region-h"
                data-ocid="edit.region.height_input"
                type="number"
                step="0.1"
                min="0.1"
                value={h}
                onChange={(e) => setH(e.target.value)}
                placeholder="4"
                className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
              />
              {errors.h && (
                <p className="text-xs text-destructive">{errors.h}</p>
              )}
            </div>
          </div>

          {/* Colour */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Colour
            </Label>
            <ColourSwatchPicker selected={colour} onSelect={setColour} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            data-ocid="edit.region.cancel_button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid="edit.region.save_button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : null}
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SidebarProps ──────────────────────────────────────────────────────────

interface SidebarProps {
  points: Point[];
  regions: Region[];
  isLoadingPoints: boolean;
  isLoadingRegions: boolean;
  pointsError: Error | null;
  regionsError: Error | null;
  isCollapsed: boolean;
  onToggle: () => void;
  pointColours: Record<string, string>;
  regionColours: Record<string, string>;
  onSetPointColour: (id: string, colour: string) => void;
  onSetRegionColour: (id: string, colour: string) => void;
}

// ─── PointForm ─────────────────────────────────────────────────────────────

function PointForm() {
  const [label, setLabel] = useState("");
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const addPoint = useAddPoint();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!label.trim()) e.label = "Label is required";
    const xn = Number.parseFloat(x);
    const yn = Number.parseFloat(y);
    if (x === "" || Number.isNaN(xn)) e.x = "Enter a number";
    else if (xn < -10 || xn > 10) e.x = "Must be between -10 and 10";
    if (y === "" || Number.isNaN(yn)) e.y = "Enter a number";
    else if (yn < -10 || yn > 10) e.y = "Must be between -10 and 10";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await addPoint.mutateAsync({
        name: label.trim(),
        x: Number.parseFloat(x),
        y: Number.parseFloat(y),
      });
      setLabel("");
      setX("");
      setY("");
      setErrors({});
      toast.success(`Point "${label.trim()}" added`);
    } catch {
      toast.error("Failed to add point");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label
          htmlFor="point-label"
          className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
        >
          Label
        </Label>
        <Input
          id="point-label"
          data-ocid="point.label_input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. My Point"
          className="h-8 text-sm bg-muted/50 border-border/60 focus-visible:ring-ring/50"
        />
        {errors.label && (
          <p
            className="text-xs text-destructive flex items-center gap-1"
            data-ocid="point.error_state"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.label}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label
            htmlFor="point-x"
            className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
          >
            X
          </Label>
          <Input
            id="point-x"
            data-ocid="point.x_input"
            type="number"
            step="0.1"
            min="-10"
            max="10"
            value={x}
            onChange={(e) => setX(e.target.value)}
            placeholder="0"
            className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
          />
          {errors.x && <p className="text-xs text-destructive">{errors.x}</p>}
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="point-y"
            className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
          >
            Y
          </Label>
          <Input
            id="point-y"
            data-ocid="point.y_input"
            type="number"
            step="0.1"
            min="-10"
            max="10"
            value={y}
            onChange={(e) => setY(e.target.value)}
            placeholder="0"
            className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
          />
          {errors.y && <p className="text-xs text-destructive">{errors.y}</p>}
        </div>
      </div>

      <Button
        data-ocid="point.add_button"
        type="submit"
        size="sm"
        className="w-full h-8 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        disabled={addPoint.isPending}
      >
        {addPoint.isPending ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5 mr-1.5" />
        )}
        {addPoint.isPending ? "Adding…" : "Add Point"}
      </Button>
    </form>
  );
}

// ─── RegionForm ────────────────────────────────────────────────────────────

function RegionForm() {
  const [label, setLabel] = useState("");
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const addRegion = useAddRegion();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!label.trim()) e.label = "Label is required";
    const xn = Number.parseFloat(x);
    const yn = Number.parseFloat(y);
    const wn = Number.parseFloat(w);
    const hn = Number.parseFloat(h);
    if (x === "" || Number.isNaN(xn)) e.x = "Enter a number";
    else if (xn < -10 || xn > 10) e.x = "Must be -10 to 10";
    if (y === "" || Number.isNaN(yn)) e.y = "Enter a number";
    else if (yn < -10 || yn > 10) e.y = "Must be -10 to 10";
    if (w === "" || Number.isNaN(wn)) e.w = "Enter a number";
    else if (wn <= 0) e.w = "Must be positive";
    if (h === "" || Number.isNaN(hn)) e.h = "Enter a number";
    else if (hn <= 0) e.h = "Must be positive";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await addRegion.mutateAsync({
        name: label.trim(),
        x: Number.parseFloat(x),
        y: Number.parseFloat(y),
        width: Number.parseFloat(w),
        height: Number.parseFloat(h),
      });
      setLabel("");
      setX("");
      setY("");
      setW("");
      setH("");
      setErrors({});
      toast.success(`Region "${label.trim()}" added`);
    } catch {
      toast.error("Failed to add region");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label
          htmlFor="region-label"
          className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
        >
          Label
        </Label>
        <Input
          id="region-label"
          data-ocid="region.label_input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Zone A"
          className="h-8 text-sm bg-muted/50 border-border/60 focus-visible:ring-ring/50"
        />
        {errors.label && (
          <p
            className="text-xs text-destructive flex items-center gap-1"
            data-ocid="region.error_state"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.label}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label
            htmlFor="region-x"
            className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
          >
            Center X
          </Label>
          <Input
            id="region-x"
            data-ocid="region.x_input"
            type="number"
            step="0.1"
            min="-10"
            max="10"
            value={x}
            onChange={(e) => setX(e.target.value)}
            placeholder="0"
            className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
          />
          {errors.x && <p className="text-xs text-destructive">{errors.x}</p>}
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="region-y"
            className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
          >
            Center Y
          </Label>
          <Input
            id="region-y"
            data-ocid="region.y_input"
            type="number"
            step="0.1"
            min="-10"
            max="10"
            value={y}
            onChange={(e) => setY(e.target.value)}
            placeholder="0"
            className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
          />
          {errors.y && <p className="text-xs text-destructive">{errors.y}</p>}
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="region-w"
            className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
          >
            Width
          </Label>
          <Input
            id="region-w"
            data-ocid="region.width_input"
            type="number"
            step="0.1"
            min="0.1"
            value={w}
            onChange={(e) => setW(e.target.value)}
            placeholder="4"
            className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
          />
          {errors.w && <p className="text-xs text-destructive">{errors.w}</p>}
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="region-h"
            className="text-xs font-semibold tracking-wide uppercase text-muted-foreground"
          >
            Height
          </Label>
          <Input
            id="region-h"
            data-ocid="region.height_input"
            type="number"
            step="0.1"
            min="0.1"
            value={h}
            onChange={(e) => setH(e.target.value)}
            placeholder="4"
            className="h-8 text-sm bg-muted/50 border-border/60 font-mono focus-visible:ring-ring/50"
          />
          {errors.h && <p className="text-xs text-destructive">{errors.h}</p>}
        </div>
      </div>

      <Button
        data-ocid="region.add_button"
        type="submit"
        size="sm"
        className="w-full h-8 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
        disabled={addRegion.isPending}
      >
        {addRegion.isPending ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Plus className="w-3.5 h-3.5 mr-1.5" />
        )}
        {addRegion.isPending ? "Adding…" : "Add Region"}
      </Button>
    </form>
  );
}

// ─── PointsList ────────────────────────────────────────────────────────────

function PointsList({
  points,
  isLoading,
  error,
  pointColours,
  onSetPointColour,
}: {
  points: Point[];
  isLoading: boolean;
  error: Error | null;
  pointColours: Record<string, string>;
  onSetPointColour: (id: string, colour: string) => void;
}) {
  const deletePoint = useDeletePoint();
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-6"
        data-ocid="point.loading_state"
      >
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Loading points…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-2 py-3 px-2 rounded text-destructive bg-destructive/10"
        data-ocid="point.error_state"
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs">Failed to load points</span>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="text-center py-6" data-ocid="point.empty_state">
        <MapPin className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No points yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1" data-ocid="point.list">
        <AnimatePresence initial={false}>
          {points.map((p, i) => (
            <motion.div
              key={p.id.toString()}
              data-ocid={`point.item.${i + 1}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-muted/30 hover:bg-muted/50 group transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    pointColours[p.id.toString()] ??
                    "oklch(0.78 0.16 62 / 0.7)",
                }}
              />
              <span className="flex-1 text-xs font-medium truncate">
                {p.name}
              </span>
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                ({p.x}, {p.y})
              </span>
              <button
                type="button"
                data-ocid={`point.edit_button.${i + 1}`}
                onClick={() => setEditingPoint(p)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-0.5 rounded focus-visible:opacity-100"
                aria-label={`Edit point ${p.name}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                data-ocid={`point.delete_button.${i + 1}`}
                onClick={() => {
                  deletePoint.mutate(p.id);
                  toast.success(`Deleted "${p.name}"`);
                }}
                disabled={deletePoint.isPending}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded focus-visible:opacity-100"
                aria-label={`Delete point ${p.name}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Edit dialog rendered outside the list to avoid nesting issues */}
      {editingPoint && (
        <EditPointDialog
          point={editingPoint}
          currentColour={
            pointColours[editingPoint.id.toString()] ?? LABEL_COLORS[0]
          }
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingPoint(null);
          }}
          onSetPointColour={onSetPointColour}
        />
      )}
    </>
  );
}

// ─── RegionsList ───────────────────────────────────────────────────────────

function RegionsList({
  regions,
  isLoading,
  error,
  regionColours,
  onSetRegionColour,
}: {
  regions: Region[];
  isLoading: boolean;
  error: Error | null;
  regionColours: Record<string, string>;
  onSetRegionColour: (id: string, colour: string) => void;
}) {
  const deleteRegion = useDeleteRegion();
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-6"
        data-ocid="region.loading_state"
      >
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Loading regions…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-2 py-3 px-2 rounded text-destructive bg-destructive/10"
        data-ocid="region.error_state"
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs">Failed to load regions</span>
      </div>
    );
  }

  if (regions.length === 0) {
    return (
      <div className="text-center py-6" data-ocid="region.empty_state">
        <Square className="w-6 h-6 mx-auto mb-1.5 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No regions yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1" data-ocid="region.list">
        <AnimatePresence initial={false}>
          {regions.map((r, i) => (
            <motion.div
              key={r.id.toString()}
              data-ocid={`region.item.${i + 1}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-muted/30 hover:bg-muted/50 group transition-colors"
            >
              <span
                className="w-2 h-2 rounded shrink-0"
                style={{
                  backgroundColor:
                    regionColours[r.id.toString()] ??
                    "oklch(0.72 0.15 195 / 0.7)",
                }}
              />
              <span className="flex-1 text-xs font-medium truncate">
                {r.name}
              </span>
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                {r.width}×{r.height}
              </span>
              <button
                type="button"
                data-ocid={`region.edit_button.${i + 1}`}
                onClick={() => setEditingRegion(r)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-0.5 rounded focus-visible:opacity-100"
                aria-label={`Edit region ${r.name}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                data-ocid={`region.delete_button.${i + 1}`}
                onClick={() => {
                  deleteRegion.mutate(r.id);
                  toast.success(`Deleted "${r.name}"`);
                }}
                disabled={deleteRegion.isPending}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5 rounded focus-visible:opacity-100"
                aria-label={`Delete region ${r.name}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {editingRegion && (
        <EditRegionDialog
          region={editingRegion}
          currentColour={
            regionColours[editingRegion.id.toString()] ?? LABEL_COLORS[0]
          }
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingRegion(null);
          }}
          onSetRegionColour={onSetRegionColour}
        />
      )}
    </>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  badge,
  accentColor,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: number;
  accentColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden bg-card/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="flex-1 text-sm font-semibold tracking-wide">
          {title}
        </span>
        {badge !== undefined && badge > 0 && (
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
            }}
          >
            {badge}
          </span>
        )}
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-3 pb-3 space-y-3">
              <div className="h-px bg-border/50" />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────

export function Sidebar({
  points,
  regions,
  isLoadingPoints,
  isLoadingRegions,
  pointsError,
  regionsError,
  isCollapsed,
  onToggle,
  pointColours,
  regionColours,
  onSetPointColour,
  onSetRegionColour,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop — only shown when sidebar is open on mobile */}
      {!isCollapsed && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/40"
          onClick={onToggle}
          onKeyDown={(e) => e.key === "Escape" && onToggle()}
          role="button"
          tabIndex={-1}
          aria-label="Close sidebar"
        />
      )}

      <aside
        data-ocid="sidebar.panel"
        className={[
          "h-full flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden",
          "transition-[width] duration-200 ease-in-out",
          // Mobile: absolute overlay, hidden when collapsed
          "absolute inset-y-0 left-0 z-30 md:relative md:z-auto",
          isCollapsed ? "w-0 md:w-10" : "w-80",
        ].join(" ")}
      >
        {/* Collapsed desktop strip — only the toggle button */}
        {isCollapsed && (
          <div className="hidden md:flex flex-col items-center pt-3">
            <button
              type="button"
              data-ocid="sidebar.toggle"
              onClick={onToggle}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Expanded content */}
        {!isCollapsed && (
          <>
            {/* Header */}
            <div className="px-4 py-4 border-b border-sidebar-border/60 shrink-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-1.5 h-5 rounded-full bg-primary" />
                <h1 className="text-base font-bold tracking-tight flex-1">
                  Graph Editor
                </h1>
                {/* Collapse button */}
                <button
                  type="button"
                  data-ocid="sidebar.toggle"
                  onClick={onToggle}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground pl-3.5">
                Pari ↔ Rivyom · Bad ↕ Good
              </p>
            </div>

            {/* Scrollable content */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 space-y-3">
                {/* Points section */}
                <Section
                  icon={<MapPin className="w-4 h-4" />}
                  title="Points"
                  badge={points.length}
                  accentColor="oklch(0.78 0.16 62)"
                  defaultOpen={true}
                >
                  <PointForm />
                  <PointsList
                    points={points}
                    isLoading={isLoadingPoints}
                    error={pointsError}
                    pointColours={pointColours}
                    onSetPointColour={onSetPointColour}
                  />
                </Section>

                {/* Regions section */}
                <Section
                  icon={<Square className="w-4 h-4" />}
                  title="Regions"
                  badge={regions.length}
                  accentColor="oklch(0.72 0.15 195)"
                  defaultOpen={true}
                >
                  <RegionForm />
                  <RegionsList
                    regions={regions}
                    isLoading={isLoadingRegions}
                    error={regionsError}
                    regionColours={regionColours}
                    onSetRegionColour={onSetRegionColour}
                  />
                </Section>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-sidebar-border/60 shrink-0">
              <p className="text-xs text-muted-foreground text-center">
                © {new Date().getFullYear()}.{" "}
                <a
                  href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Built with love using caffeine.ai
                </a>
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
