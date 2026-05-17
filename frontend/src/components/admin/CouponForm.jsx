import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const DISCOUNT_TYPES = [
  { value: "FIXED", label: "Fixed Amount" },
  { value: "PERCENTAGE", label: "Percentage" },
];

export default function CouponForm({ initialData, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    discountType: "FIXED",
    discountValue: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    startsAt: "",
    expiresAt: "",
    totalUsageLimit: "",
    perUserLimit: "",
    isFirstOrderOnly: false,
    isActive: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || "",
        title: initialData.title || "",
        description: initialData.description || "",
        discountType: initialData.discountType || "FIXED",
        discountValue: initialData.discountValue?.toString() || "",
        minOrderAmount: initialData.minOrderAmount?.toString() || "",
        maxDiscountAmount: initialData.maxDiscountAmount?.toString() || "",
        startsAt: initialData.startsAt ? formatDateForInput(initialData.startsAt) : "",
        expiresAt: initialData.expiresAt ? formatDateForInput(initialData.expiresAt) : "",
        totalUsageLimit: initialData.totalUsageLimit?.toString() || "",
        perUserLimit: initialData.perUserLimit?.toString() || "",
        isFirstOrderOnly: initialData.isFirstOrderOnly || false,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    }
  }, [initialData]);

  function formatDateForInput(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submittedData = {
      code: formData.code,
      title: formData.title || null,
      description: formData.description || null,
      discountType: formData.discountType,
      discountValue: formData.discountValue ? parseFloat(formData.discountValue) : null,
      minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
      maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      totalUsageLimit: formData.totalUsageLimit ? parseInt(formData.totalUsageLimit, 10) : null,
      perUserLimit: formData.perUserLimit ? parseInt(formData.perUserLimit, 10) : null,
      isFirstOrderOnly: formData.isFirstOrderOnly,
      isActive: formData.isActive,
    };
    onSubmit(submittedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field>
        <FieldLabel>Code *</FieldLabel>
        <FieldContent>
          <Input
            value={formData.code}
            onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
            placeholder="e.g. SUMMER20"
            required
            disabled={isLoading}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Title</FieldLabel>
        <FieldContent>
          <Input
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="e.g. Summer Sale"
            disabled={isLoading}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel>Description</FieldLabel>
        <FieldContent>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Optional description"
            disabled={isLoading}
          />
        </FieldContent>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Discount Type *</FieldLabel>
          <FieldContent>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.discountType}
              onChange={(e) => handleChange("discountType", e.target.value)}
              disabled={isLoading}
            >
              {DISCOUNT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Discount Value *</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.discountValue}
              onChange={(e) => handleChange("discountValue", e.target.value)}
              placeholder="e.g. 10"
              required
              disabled={isLoading}
            />
          </FieldContent>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Min Order Amount</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.minOrderAmount}
              onChange={(e) => handleChange("minOrderAmount", e.target.value)}
              placeholder="e.g. 50"
              disabled={isLoading}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Max Discount Amount</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.maxDiscountAmount}
              onChange={(e) => handleChange("maxDiscountAmount", e.target.value)}
              placeholder="e.g. 100"
              disabled={isLoading}
            />
          </FieldContent>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Start Date</FieldLabel>
          <FieldContent>
            <Input
              type="datetime-local"
              value={formData.startsAt}
              onChange={(e) => handleChange("startsAt", e.target.value)}
              disabled={isLoading}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Expiry Date</FieldLabel>
          <FieldContent>
            <Input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => handleChange("expiresAt", e.target.value)}
              disabled={isLoading}
            />
          </FieldContent>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Total Usage Limit</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              min="1"
              value={formData.totalUsageLimit}
              onChange={(e) => handleChange("totalUsageLimit", e.target.value)}
              placeholder="e.g. 100"
              disabled={isLoading}
            />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Per User Limit</FieldLabel>
          <FieldContent>
            <Input
              type="number"
              min="1"
              value={formData.perUserLimit}
              onChange={(e) => handleChange("perUserLimit", e.target.value)}
              placeholder="e.g. 1"
              disabled={isLoading}
            />
          </FieldContent>
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isFirstOrderOnly"
          checked={formData.isFirstOrderOnly}
          onCheckedChange={(checked) => handleChange("isFirstOrderOnly", !!checked)}
          disabled={isLoading}
        />
        <Label htmlFor="isFirstOrderOnly" className="text-sm font-normal">
          First order only
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange("isActive", !!checked)}
          disabled={isLoading}
        />
        <Label htmlFor="isActive" className="text-sm font-normal">
          Active
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Saving..." : initialData ? "Update Coupon" : "Create Coupon"}
      </Button>
    </form>
  );
}

CouponForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

CouponForm.defaultProps = {
  initialData: null,
  isLoading: false,
};