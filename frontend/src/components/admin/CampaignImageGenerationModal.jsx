import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Box,
  Alert,
  Image,
  Typography,
  Stack,
  Paper,
} from '@mui/material';
import { generateCampaignImagePreview, applyCampaignImage } from '../../services/campaignImageService';

/**
 * Modal for AI-generated campaign hero billboard image preview and application.
 *
 * Flow:
 * 1. Admin opens modal, optionally enters creative direction
 * 2. Admin clicks "Generate Preview" to fetch AI image options
 * 3. Admin reviews the generated image
 * 4. Admin either "Regenerate" for a different image or "Use This Image" to apply
 * 5. Modal closes, campaign is updated with new image URL
 *
 * Props:
 *   open: boolean - Modal visibility
 *   campaignId: number - Campaign being edited
 *   campaignName: string - Display name
 *   locationId: number - Authorization scope
 *   currentImageUrl: string - Current campaign image (for display)
 *   onClose: () => void - Called when modal closes
 *   onImageApplied: (data) => void - Called after image successfully applied
 */
export default function CampaignImageGenerationModal({
  open,
  campaignId,
  campaignName,
  locationId,
  currentImageUrl,
  onClose,
  onImageApplied,
}) {
  const [creativeDirection, setCreativeDirection] = useState('');
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
      const result = await generateCampaignImagePreview(
        campaignId,
        locationId,
        creativeDirection || null,
      );

      // Store previous URL for cleanup on regenerate
      if (generatedImageUrl) {
        setPreviousGeneratedUrl(generatedImageUrl);
      }

      setGeneratedImageUrl(result.imageUrls[0]);
      setGeneratedPrompt(result.imagePrompt);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate image. Please try again.');
      console.error('Campaign image generation error:', err);
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
      const result = await applyCampaignImage(
        campaignId,
        locationId,
        generatedImageUrl,
        previousGeneratedUrl,
      );

      onImageApplied(result);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply image. Please try again.');
      console.error('Campaign image application error:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setCreativeDirection('');
    setGeneratedImageUrl(null);
    setGeneratedPrompt(null);
    setPreviousGeneratedUrl(null);
    setError(null);
    setIsGenerating(false);
    setIsApplying(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Campaign Hero Image</DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Current image display */}
          {currentImageUrl && !generatedImageUrl && (
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Current Image
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  backgroundImage: `url(${currentImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 1,
                  mt: 1,
                }}
              />
            </Paper>
          )}

          {/* Creative direction input */}
          <TextField
            label="Creative Direction (Optional)"
            placeholder="e.g., 'warm lighting, vibrant colors, close-up shot'"
            multiline
            rows={3}
            fullWidth
            value={creativeDirection}
            onChange={(e) => setCreativeDirection(e.target.value)}
            disabled={isGenerating || isApplying}
            helperText="Optional hints to guide the AI image generation"
          />

          {/* Generated image preview */}
          {generatedImageUrl && (
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Generated Preview
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  backgroundImage: `url(${generatedImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 1,
                  mt: 1,
                  position: 'relative',
                }}
              />
              {generatedPrompt && (
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{
                    mt: 1,
                    display: 'block',
                    maxHeight: 80,
                    overflow: 'auto',
                    p: 1,
                    bgcolor: 'white',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  <strong>Prompt used:</strong> {generatedPrompt}
                </Typography>
              )}
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isGenerating || isApplying}>
          Cancel
        </Button>

        {!generatedImageUrl && (
          <Button
            onClick={handleGenerate}
            variant="contained"
            disabled={isGenerating || isApplying}
            startIcon={isGenerating && <CircularProgress size={20} />}
          >
            {isGenerating ? 'Generating...' : 'Generate Preview'}
          </Button>
        )}

        {generatedImageUrl && (
          <>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isApplying}
              startIcon={isGenerating && <CircularProgress size={20} />}
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
            <Button
              onClick={handleApplyImage}
              variant="contained"
              color="success"
              disabled={isGenerating || isApplying}
              startIcon={isApplying && <CircularProgress size={20} />}
            >
              {isApplying ? 'Applying...' : 'Use This Image'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
