# Frontend Migration Guide

## Overview
This guide helps frontend developers migrate from the old string-based category/tag system to the new ID-based system with separate endpoints.

## Key Changes

### Before (Old API)
```javascript
// Fetching menu with string category
GET /menu?category=Breakfast%20Specials

// Creating menu item
POST /menu {
  name: "Item",
  category: "Breakfast Specials",  // String
  tag: "Spicy"                     // String
}

// No separate category/tag endpoints
```

### After (New API)
```javascript
// Fetching categories first
GET /categories -> Get all categories with IDs

// Fetching menu with category ID
GET /menu?categoryId=1

// Creating menu item
POST /menu {
  name: "Item",
  category: { id: 1 },  // Object with ID
  tag: { id: 1 }        // Object with ID
}

// New endpoints for category/tag management
GET /categories
GET /tags
POST /categories (Admin)
POST /tags (Admin)
```

---

## Implementation Steps

### Step 1: Update Category Selection in Your UI

**Before:**
```javascript
// You had to type or guess category names
<input type="text" name="category" placeholder="Enter category name" />
```

**After:**
```javascript
// Load categories from API
const [categories, setCategories] = useState([]);

useEffect(() => {
  fetch('/categories')
    .then(r => r.json())
    .then(data => setCategories(data));
}, []);

// Use dropdown with IDs
<select name="categoryId">
  {categories.map(cat => (
    <option key={cat.id} value={cat.id}>
      {cat.name}
    </option>
  ))}
</select>
```

### Step 2: Update Tag Selection

**Before:**
```javascript
// Manual text input for tags
<input type="text" name="tag" placeholder="Enter tag name" />
```

**After:**
```javascript
// Load tags from API
const [tags, setTags] = useState([]);

useEffect(() => {
  fetch('/tags')
    .then(r => r.json())
    .then(data => setTags(data));
}, []);

// Use dropdown or multi-select with IDs
<select name="tagId">
  {tags.map(tag => (
    <option key={tag.id} value={tag.id}>
      {tag.name}
    </option>
  ))}
</select>
```

### Step 3: Update Menu Item Creation

**Before:**
```javascript
const formData = new FormData();
formData.append('name', 'Oat Meal');
formData.append('price', 99);
formData.append('category', 'Breakfast Specials');  // String
formData.append('tag', 'Mild');                     // String
formData.append('image', imageFile);

fetch('/menu', {
  method: 'POST',
  body: formData
});
```

**After:**
```javascript
const formData = new FormData();
formData.append('name', 'Oat Meal');
formData.append('price', 99);
formData.append('categoryId', 1);    // ID as number
formData.append('tagId', 2);         // ID as number
formData.append('image', imageFile);

fetch('/menu', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Step 4: Update Menu Filtering

**Before:**
```javascript
// Using category name (URL encoded)
fetch(`/menu?category=${categoryName}`)
  .then(r => r.json())
  .then(items => {
    // Handle items
  });
```

**After:**
```javascript
// Using category ID
fetch(`/menu?categoryId=${categoryId}`)
  .then(r => r.json())
  .then(items => {
    // Handle items
  });
```

### Step 5: Update Menu Item Updates

**Before:**
```javascript
const updatedItem = {
  name: 'Updated Name',
  category: 'Lunch Meals',  // String
  tag: 'Premium'            // String
};

fetch(`/menu/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updatedItem)
});
```

**After:**
```javascript
const updatedItem = {
  name: 'Updated Name',
  categoryId: 2,  // ID
  tagId: 5        // ID
};

fetch(`/menu/${itemId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(updatedItem)
});
```

---

## Complete Example: Admin Menu Management Component

### React Component with New APIs

```javascript
import React, { useState, useEffect } from 'react';

function MenuItemForm({ itemId, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    basePrice: 0,
    categoryId: '',
    tagId: '',
    description: '',
    available: true,
    isVeg: false,
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load categories and tags on mount
  useEffect(() => {
    Promise.all([
      fetch('/categories').then(r => r.json()),
      fetch('/tags').then(r => r.json())
    ]).then(([cats, tags]) => {
      setCategories(cats);
      setTags(tags);
    }).catch(err => setError('Failed to load categories/tags'));

    // Load existing item if editing
    if (itemId) {
      fetch(`/menu/${itemId}`)
        .then(r => r.json())
        .then(item => {
          setFormData({
            name: item.name,
            basePrice: item.basePrice,
            categoryId: item.category?.id || '',
            tagId: item.tag?.id || '',
            description: item.description,
            available: item.available,
            isVeg: item.isVeg,
            image: null
          });
        });
    }
  }, [itemId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    setFormData(prev => ({
      ...prev,
      image: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('price', formData.basePrice);
      form.append('categoryId', formData.categoryId);
      form.append('tagId', formData.tagId);
      form.append('description', formData.description);
      form.append('available', formData.available);
      form.append('isVeg', formData.isVeg);
      if (formData.image) {
        form.append('image', formData.image);
      }

      const token = localStorage.getItem('adminToken');
      const url = itemId ? `/menu/${itemId}` : '/menu';
      const method = itemId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      onSuccess?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <div>
        <label>Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
      </div>

      <div>
        <label>Price</label>
        <input
          type="number"
          name="basePrice"
          value={formData.basePrice}
          onChange={handleInputChange}
          step="0.01"
          required
        />
      </div>

      <div>
        <label>Category</label>
        <select
          name="categoryId"
          value={formData.categoryId}
          onChange={handleInputChange}
          required
        >
          <option value="">Select Category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Tag</label>
        <select
          name="tagId"
          value={formData.tagId}
          onChange={handleInputChange}
        >
          <option value="">Select Tag (Optional)</option>
          {tags.map(tag => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            name="available"
            checked={formData.available}
            onChange={handleInputChange}
          />
          Available
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            name="isVeg"
            checked={formData.isVeg}
            onChange={handleInputChange}
          />
          Vegetarian
        </label>
      </div>

      <div>
        <label>Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : (itemId ? 'Update' : 'Create')}
      </button>
    </form>
  );
}

export default MenuItemForm;
```

---

## Complete Example: Menu Display Component

```javascript
import React, { useState, useEffect } from 'react';

function MenuDisplay() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load all categories
    fetch('/categories')
      .then(r => r.json())
      .then(data => {
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategoryId(data[0].id);
        }
      });
  }, []);

  // Load menu items whenever category changes
  useEffect(() => {
    if (!selectedCategoryId) return;

    setLoading(true);
    fetch(`/menu?categoryId=${selectedCategoryId}`)
      .then(r => r.json())
      .then(data => {
        setMenuItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading menu:', err);
        setLoading(false);
      });
  }, [selectedCategoryId]);

  return (
    <div className="menu-display">
      <div className="category-selector">
        <label>Select Category:</label>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading menu items...</p>
      ) : (
        <div className="menu-items">
          {menuItems.map(item => (
            <div key={item.id} className="menu-item">
              <img src={item.imageUrl} alt={item.name} />
              <h3>{item.name}</h3>
              <p className="description">{item.description}</p>
              <p className="category">
                Category: {item.category?.name}
              </p>
              {item.tag && (
                <p className="tag">Tag: {item.tag.name}</p>
              )}
              {item.isVeg && (
                <span className="veg-badge">🥬 Vegetarian</span>
              )}
              <p className="price">₹{item.basePrice}</p>
              <button>Add to Cart</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuDisplay;
```

---

## Common Mistakes to Avoid

❌ **Wrong:** Using string category name instead of ID
```javascript
// DON'T DO THIS
fetch('/menu?category=Breakfast Specials')
```

✅ **Correct:** Using category ID
```javascript
// DO THIS
fetch('/menu?categoryId=1')
```

---

❌ **Wrong:** Forgetting to send IDs when creating items
```javascript
// DON'T DO THIS
const formData = {
  name: 'Item',
  category: 'Breakfast',  // String
  tag: 'Spicy'           // String
}
```

✅ **Correct:** Send IDs
```javascript
// DO THIS
const formData = new FormData();
formData.append('categoryId', 1);  // ID
formData.append('tagId', 2);       // ID
```

---

❌ **Wrong:** Using old endpoint that doesn't exist
```javascript
// DON'T DO THIS - This endpoint no longer works
fetch('/categories/search?name=Breakfast')
```

✅ **Correct:** Use new endpoints
```javascript
// DO THIS
fetch('/categories')  // Get all and filter client-side
  .then(r => r.json())
  .then(cats => cats.find(c => c.name === 'Breakfast'))
```

---

## Troubleshooting

### Issue: "Category not found with id: X"
**Solution:** Make sure the categoryId exists. Fetch `/categories` to see valid IDs.

### Issue: Menu items not showing after category change
**Solution:** Add loading state and error handling. Check network tab in DevTools.

### Issue: Can't create/update menu items
**Solution:** Ensure you're sending Authorization header with admin token and IDs instead of strings.

### Issue: Category dropdown not loading
**Solution:** Check if fetch('/categories') is working. Look for CORS issues in browser console.

---

## Testing Checklist

- [ ] Can fetch all categories without authentication
- [ ] Can fetch all tags without authentication
- [ ] Can filter menu by categoryId
- [ ] Can create menu item with categoryId and tagId (as admin)
- [ ] Can update menu item category and tag (as admin)
- [ ] Category/tag dropdowns populate correctly
- [ ] Menu items display correct category and tag information
- [ ] Can upload images when creating/updating items
- [ ] Error messages display appropriately
- [ ] Authentication is required for admin endpoints

---

## Need Help?

Refer to:
- API_EXAMPLES.md - Complete API usage examples
- REFACTORING_SUMMARY.md - Technical details of changes

