import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { generateCategoryImagePreview, applyCategoryImage } from '../../services/categoryImageService';

/**
 * Modal for AI-generated category food-photography image preview and application.
 *
 * Flow:
 * 1. Admin opens modal, optionally enters additional prompt
 * 2. Admin clicks "Generate Preview" to fetch AI image options
 * 3. Admin reviews the generated food photograph
 * 4. Admin either "Regenerate" for a different image or "Use This Image" to apply
 * 5. Modal closes, category is updated with new image URL
 *
 * Props:
 *   open: boolean - Modal visibility
 *   categoryId: number - Category being edited
 *   categoryName: string - Display name
 *   locationId: number - Authorization scope
 *   currentImageUrl: string - Current category image (for display)
 *   onClose: () => void - Called when modal closes
 *   onImageApplied: (data) => void - Called after image successfully applied
 */
export default function CategoryImageGenerationModal({
  open,
  categoryId,
  categoryName,
  locationId,
  currentImageUrl,
  onClose,
  onImageApplied,
}) {
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [previousGeneratedUrl, setPreviousGeneratedUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const result = await generateCategoryImagePreview(
        categoryId,
        locationId,
        additionalPrompt || null,
      );

      // Store previous URL for cleanup on regenerate
      if (generatedImageUrl) {
        setPreviousGeneratedUrl(generatedImageUrl);
      }

      setGeneratedImageUrl(result.imageUrls[0]);
      setGeneratedPrompt(result.imagePrompt);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate image. Please try again.');
      console.error('Category image generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyImage = async () => {
    if (!generatedImageUrl) {
      setError('No generated image to apply.');
      return;
    }

    setError(null);
    setIsApplying(true);

    try {
      const result = await applyCategoryImage(
        categoryId,
        locationId,
        generatedImageUrl,
        previousGeneratedUrl,
      );

      onImageApplied(result);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply image. Please try again.');
      console.error('Category image application error:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setAdditionalPrompt('');
    setGeneratedImageUrl(null);
    setGeneratedPrompt(null);
    setPreviousGeneratedUrl(null);
    setError(null);
    setIsGenerating(false);
    setIsApplying(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Category Image</DialogTitle>
          <DialogDescription>
            Create an AI-generated food photograph for the "{categoryName}" category
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category name display */}
          <div className="rounded-lg border bg-muted p-3 flex items-center gap-3">
            {currentImageUrl && (
              <Avatar
                className="w-14 h-14"
                src={currentImageUrl}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div>
              <Label className="text-xs font-semibold">Category</Label>
              <p className="font-semibold">{categoryName}</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current image display */}
          {currentImageUrl && !generatedImageUrl && (
            <div className="rounded-lg border bg-muted p-3">
              <Label className="text-xs font-semibold">Current Image</Label>
              <div
                className="w-full h-32 bg-muted rounded-lg mt-2"
                style={{
                  backgroundImage: `url(${currentImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </div>
          )}

          {/* Additional prompt input */}
          <div className="space-y-2">
            <Label htmlFor="additional-prompt">Creative Direction (Optional)</Label>
            <Input
              id="additional-prompt"
              placeholder="e.g., 'vibrant spices, aromatic steam, close-up shot'"
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              disabled={isGenerating || isApplying}
              className="min-h-20"
            />
            <p className="text-xs text-muted-foreground">
              Optional hints to guide the AI food photography
            </p>
          </div>

          {/* Generated image preview */}
          {generatedImageUrl && (
            <div className="rounded-lg border bg-muted p-3">
              <Label className="text-xs font-semibold">Generated Preview</Label>
              <div
                className="w-full h-40 bg-muted rounded-lg mt-2"
                style={{
                  backgroundImage: `url(${generatedImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {generatedPrompt && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-semibold text-muted-foreground">
                    View prompt
                  </summary>
                  <p className="mt-2 p-2 bg-background rounded text-muted-foreground">
                    {generatedPrompt}
                  </p>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating || isApplying}>
            Cancel
          </Button>

          {!generatedImageUrl && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isApplying}
            >
              {isGenerating && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isGenerating ? 'Generating...' : 'Generate Preview'}
            </Button>
          )}

          {generatedImageUrl && (
            <>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating || isApplying}
              >
                {isGenerating && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button
                onClick={handleApplyImage}
                disabled={isGenerating || isApplying}
              >
                {isApplying && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isApplying ? 'Applying...' : 'Use This Image'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
