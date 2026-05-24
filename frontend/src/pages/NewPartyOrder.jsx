import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createPartyOrder } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getLocalDateTimeString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function NewPartyOrder({ className }) {
  const navigate = useNavigate();
  const [eventDateTime, setEventDateTime] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!eventDateTime) {
      newErrors.eventDateTime = "Event date and time is required";
    } else if (new Date(eventDateTime) <= new Date()) {
      newErrors.eventDateTime = "Event date must be in the future";
    }
    if (!numberOfPeople) {
      newErrors.numberOfPeople = "Number of people is required";
    } else if (Number(numberOfPeople) < 10) {
      newErrors.numberOfPeople = "Minimum 10 people required";
    }
    if (!menuDescription.trim()) {
      newErrors.menuDescription = "Menu description is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await createPartyOrder({
        eventDateTime: new Date(eventDateTime).toISOString(),
        numberOfPeople: Number(numberOfPeople),
        menuDescription: menuDescription.trim(),
      });
      toast.success("Party order submitted successfully!");
      navigate({ to: "/orders" });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to submit party order. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>
      <Field>
        <FieldLabel>Event Date & Time</FieldLabel>
        <FieldContent>
          <Input
            type="datetime-local"
            value={eventDateTime}
            onChange={(e) => setEventDateTime(e.target.value)}
            min={getLocalDateTimeString()}
            aria-invalid={!!errors.eventDateTime}
          />
          {errors.eventDateTime && (
            <p className="text-sm text-destructive">{errors.eventDateTime}</p>
          )}
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Number of People</FieldLabel>
        <FieldContent>
          <Input
            type="number"
            min="10"
            placeholder="e.g. 50"
            value={numberOfPeople}
            onChange={(e) => setNumberOfPeople(e.target.value)}
            aria-invalid={!!errors.numberOfPeople}
          />
          {errors.numberOfPeople && (
            <p className="text-sm text-destructive">{errors.numberOfPeople}</p>
          )}
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Preferred Menu</FieldLabel>
        <FieldContent>
          <Textarea
            rows={5}
            placeholder="Veg Biryani, Chicken Curry, Paneer Butter Masala, ..."
            value={menuDescription}
            onChange={(e) => setMenuDescription(e.target.value)}
            aria-invalid={!!errors.menuDescription}
            className="resize-none"
          />
          {errors.menuDescription && (
            <p className="text-sm text-destructive">{errors.menuDescription}</p>
          )}
        </FieldContent>
      </Field>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
