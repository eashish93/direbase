'use client';

import { Button } from "@/elements/button";
import { TextField } from "@/elements/textfield";
import { NumberField } from "@/elements/numfield";
import { Select, ListBoxItem } from "@/elements/select";
import { MultiSelect } from "@/elements/multiselect";
import { Switch } from "@/elements/switch";
import { FileTrigger, Button as AriaButton } from "react-aria-components";
import { saveProduct } from "@/lib/actions/productActions";
import { useRef, useState, useEffect } from "react";
import { IconBallBowling, IconUpload, IconPhoto, IconPlus } from "@tabler/icons-react";
import { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/constants";

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
}

const IS_DEV = process.env.NODE_ENV === 'development';

export default function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(product?.tags || [])
  );
  const [iconUrl, setIconUrl] = useState<string | null>(product?.icon || null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(product?.thumbnail || null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [isNew, setIsNew] = useState(product?.isNew || false);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured || false);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Convert categories to items format for MultiSelect
  const tagItems = CATEGORIES.map(category => ({
    id: category,
    name: category
  }));
  
  const productTypes = [
    { id: 'tool', name: 'Tool' },
    { id: 'template', name: 'Template' },
    { id: 'website', name: 'Website' }
  ];
  
  const pricingOptions = [
    { id: 'false', name: 'Free' },
    { id: 'true', name: 'Paid' }
  ];
  
  // Update hidden input when selectedTags changes
  useEffect(() => {
    const tagsInput = formRef.current?.querySelector('[name="tags"]') as HTMLInputElement;
    if (tagsInput) {
      tagsInput.value = Array.from(selectedTags).join(',');
    }
  }, [selectedTags]);
  
  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    
    // Add isNew and isFeatured to formData
    formData.set('isNew', isNew.toString());
    formData.set('isFeatured', isFeatured.toString());
    
    try {
      const result = await saveProduct(formData);
      
      if (result.success) {
        // Reset form and state
        formRef.current?.reset();
        setSelectedTags(new Set());
        setIconUrl(null);
        setThumbnailUrl(null);
        setIsNew(false);
        setIsFeatured(false);
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || "Failed to save product");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Handle tag selection change
  const handleTagsChange = (selection: Set<string>) => {
    setSelectedTags(selection);
  };

  async function uploadFile(file: File, type: 'icon' | 'thumbnail') {
    try {
      // Check file size before uploading
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        throw new Error('File size exceeds 10MB limit');
      }
      
      if (type === 'icon') {
        setUploadingIcon(true);
      } else {
        setUploadingThumbnail(true);
      }

      const formData = new FormData();

      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json() as { success: boolean; key?: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const fileUrl = IS_DEV ? `/api/upload?key=${result.key}` : `${process.env.NEXT_PUBLIC_R2_URL}/${result.key}`;
      
      if (type === 'icon') {
        setIconUrl(fileUrl);
        const iconInput = formRef.current?.querySelector('[name="icon"]') as HTMLInputElement;
        if (iconInput) {
          iconInput.value = fileUrl;
        }
      } else {
        setThumbnailUrl(fileUrl);
        const thumbnailInput = formRef.current?.querySelector('[name="thumbnail"]') as HTMLInputElement;
        if (thumbnailInput) {
          thumbnailInput.value = fileUrl;
        }
      }

      return fileUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      return null;
    } finally {
      if (type === 'icon') {
        setUploadingIcon(false);
      } else {
        setUploadingThumbnail(false);
      }
    }
  }
  
  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5 bg-white">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {product?.id && <input type="hidden" name="id" value={product.id} />}

      <div>
        <Select
          name="type"
          label="Product Type"
          defaultSelectedKey={product?.type || 'tool'}>
          {productTypes.map((type) => (
            <ListBoxItem key={type.id} id={type.id}>
              {type.name}
            </ListBoxItem>
          ))}
        </Select>
      </div>

      <TextField name="name" label="Name" defaultValue={product?.name || ''} isRequired />


      <TextField
        name="shortDescription"
        label="Short Description"
        defaultValue={product?.shortDescription || ''}
      />

      <TextField
        name="description"
        label="Description"
        rows={4}
        defaultValue={product?.description || ''}
        multiline
      />

      <div className="grid grid-cols-2 gap-4">
        <NumberField
          name="price"
          label="Price"
          defaultValue={product?.price ? Number(product.price) : 0}
          formatOptions={{
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }}
        />

        <div>
          <Select
            name="isPaid"
            label="Pricing Type"
            defaultSelectedKey={product?.isPaid ? 'true' : 'false'}>
            {pricingOptions.map((option) => (
              <ListBoxItem key={option.id} id={option.id}>
                {option.name}
              </ListBoxItem>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="block font-medium mb-1">Icon</label>
        <input type="hidden" name="icon" value={iconUrl || ''} />
        <FileTrigger
          acceptedFileTypes={[
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/avif',
            'image/gif',
            'image/svg+xml',
          ]}
          allowsMultiple={false}
          onSelect={(files) => {
            const file = files?.[0];
            if (file) uploadFile(file, 'icon');
          }}>
          <AriaButton
            type="button"
            className="p-0 w-auto h-auto bg-transparent hover:bg-transparent focus:ring-0">
            <div className="cursor-pointer border border-gray-200 rounded-md overflow-hidden hover:border-blue-500 transition-colors">
              {iconUrl ? (
                <div className="relative group">
                  <div className="w-20 h-20">
                    <img src={iconUrl} alt="Icon" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconUpload size={24} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="size-24 bg-gray-100 flex flex-col items-center justify-center">
                  <IconPhoto size={24} className="text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">Upload Icon</span>
                </div>
              )}
            </div>
          </AriaButton>
        </FileTrigger>
        {uploadingIcon && <div className="mt-2 text-sm text-blue-600">Uploading...</div>}
      </div>

      <div>
        <label className="block font-medium mb-1">Thumbnail</label>
        <input type="hidden" name="thumbnail" value={thumbnailUrl || ''} />
        <FileTrigger
          acceptedFileTypes={[
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/svg+xml',
            'image/avif',
          ]}
          allowsMultiple={false}
          onSelect={(files) => {
            const file = files?.[0];
            if (file) uploadFile(file, 'thumbnail');
          }}>
          <AriaButton
            type="button"
            className="p-0 w-full h-auto bg-transparent hover:bg-transparent focus:ring-0">
            <div className="cursor-pointer border border-gray-200 rounded-md overflow-hidden hover:border-blue-500 transition-colors">
              {thumbnailUrl ? (
                <div className="relative group">
                  <div className="w-full h-36">
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconUpload size={24} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-52 bg-gray-100 flex flex-col items-center justify-center">
                  <IconPhoto size={32} className="text-gray-400" />
                  <span className="text-sm text-gray-500 mt-2">Upload Thumbnail</span>
                </div>
              )}
            </div>
          </AriaButton>
        </FileTrigger>
        {uploadingThumbnail && <div className="mt-2 text-sm text-blue-600">Uploading...</div>}
      </div>

      <TextField
        name="link"
        label="Link"
        placeholder="https://example.com"
        defaultValue={product?.link || ''}
        isRequired
      />

      <Switch isSelected={isNew} onChange={setIsNew} className="mt-2" size="sm" fullWidth align="right">
        Mark as <strong>New</strong>
      </Switch>

      <Switch isSelected={isFeatured} onChange={setIsFeatured} className="mt-2" size="sm" fullWidth align="right">
        Mark as <strong>Featured</strong>
      </Switch>

      <div>
        <input type="hidden" name="tags" value={Array.from(selectedTags).join(',')} />
        <MultiSelect
          label="Tags"
          placeholder="Select or create tags"
          items={tagItems}
          selectedKeys={selectedTags}
          onSelectionChange={(keys) => handleTagsChange(keys as Set<string>)}
          allowsCustomValue
          variant="normal">
          {(item) => <ListBoxItem id={item.id}>{item.name}</ListBoxItem>}
        </MultiSelect>
      </div>

      <div className="pt-4">
        <Button size="md" type="submit" className="w-full" isDisabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : product?.id ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
} 