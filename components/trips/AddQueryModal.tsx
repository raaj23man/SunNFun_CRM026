"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Compass, Sparkles, AlertCircle, Phone, Calendar, Users, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const addQuerySchema = z.object({
  salutation: z.string().default("Mr."),
  guest_name: z.string().min(1, "Guest name is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  destination_text: z.string().min(1, "Destination is required"),
  start_date: z.string().min(1, "Travel start date is required"),
  duration_days: z.coerce.number().int().min(1).default(5),
  duration_nights: z.coerce.number().int().min(0).default(4),
  pax_adults: z.coerce.number().int().min(1).default(2),
  pax_children: z.coerce.number().int().min(0).default(0),
  origin_city: z.string().optional(),
  tags_input: z.string().optional(),
});

type AddQueryFormValues = z.infer<typeof addQuerySchema>;

interface AddQueryModalProps {
  onQueryCreated?: (newTrip: any) => void;
  triggerButton?: React.ReactNode;
}

export function AddQueryModal({ onQueryCreated, triggerButton }: AddQueryModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 14);
  const defaultDateStr = defaultDate.toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddQueryFormValues>({
    resolver: zodResolver(addQuerySchema),
    defaultValues: {
      salutation: "Mr.",
      start_date: defaultDateStr,
      duration_days: 5,
      duration_nights: 4,
      pax_adults: 2,
      pax_children: 0,
    },
  });

  const onSubmit = async (values: AddQueryFormValues) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const tags = values.tags_input
        ? values.tags_input.split(",").map((t) => t.trim()).filter(Boolean)
        : ["Manual Lead"];

      const payload = {
        salutation: values.salutation,
        guest_name: values.guest_name,
        phone_number: values.phone_number,
        email: values.email || undefined,
        destination_text: values.destination_text,
        start_date: values.start_date,
        duration_days: values.duration_days,
        duration_nights: values.duration_nights,
        pax_adults: values.pax_adults,
        pax_children: values.pax_children,
        origin_city: values.origin_city || undefined,
        tags,
      };

      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create inquiry");
      }

      reset();
      setOpen(false);

      if (onQueryCreated) {
        onQueryCreated(data.trip);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold gap-1.5 h-9 shadow-sm">
            <Plus className="w-4 h-4" />
            Add New Query
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-600" />
              Add New Tour Inquiry
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quickly create a qualified lead with auto-generated sequential Trip ID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Guest Details */}
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Primary Guest Information
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Salutation</Label>
                  <select
                    {...register("salutation")}
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                  </select>
                </div>

                <div className="col-span-3 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Full Name *</Label>
                  <Input
                    {...register("guest_name")}
                    placeholder="e.g. Maya Sharma"
                    className="h-8 text-xs"
                  />
                  {errors.guest_name && (
                    <p className="text-[10px] text-red-500">{errors.guest_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    Phone Number *
                  </Label>
                  <Input
                    {...register("phone_number")}
                    placeholder="+977 9800000000"
                    className="h-8 text-xs font-mono"
                  />
                  {errors.phone_number && (
                    <p className="text-[10px] text-red-500">{errors.phone_number.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Email (Optional)</Label>
                  <Input
                    {...register("email")}
                    type="email"
                    placeholder="guest@gmail.com"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Trip Configuration */}
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Trip Configuration
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    Destination *
                  </Label>
                  <Input
                    {...register("destination_text")}
                    placeholder="Kathmandu & Pokhara"
                    className="h-8 text-xs"
                  />
                  {errors.destination_text && (
                    <p className="text-[10px] text-red-500">{errors.destination_text.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Travel Date *
                  </Label>
                  <Input
                    {...register("start_date")}
                    type="date"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Nights</Label>
                  <Input
                    {...register("duration_nights")}
                    type="number"
                    min={0}
                    className="h-8 text-xs text-center"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Days</Label>
                  <Input
                    {...register("duration_days")}
                    type="number"
                    min={1}
                    className="h-8 text-xs text-center"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Adults</Label>
                  <Input
                    {...register("pax_adults")}
                    type="number"
                    min={1}
                    className="h-8 text-xs text-center"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Children</Label>
                  <Input
                    {...register("pax_children")}
                    type="number"
                    min={0}
                    className="h-8 text-xs text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Origin City</Label>
                  <Input
                    {...register("origin_city")}
                    placeholder="e.g. Mumbai, London"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tags (Comma-separated)</Label>
                  <Input
                    {...register("tags_input")}
                    placeholder="VIP, Trekking, Family"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8"
            >
              {isSubmitting ? "Creating..." : "Save Inquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
