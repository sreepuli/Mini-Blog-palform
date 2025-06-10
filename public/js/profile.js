document.addEventListener('DOMContentLoaded', () => {
  const welcomeUser = document.getElementById('welcomeUser');
  const blogsList = document.getElementById('blogsList');
  const blogForm = document.getElementById('blogForm');
  const titleInput = document.getElementById('title');
  const categorySelect = document.getElementById('category');
  const contentDiv = document.getElementById('content');
  const charCount = document.getElementById('charCount');
  const messageDiv = document.getElementById('message');
  const logoutBtn = document.getElementById('logoutBtn');
  const resetBtn = document.getElementById('resetBtn');

  const previewTitle = document.getElementById('previewTitle');
  const previewCategory = document.getElementById('previewCategory');
  const previewContent = document.getElementById('previewContent');

  // Live preview: Title, Category, Content
  titleInput.addEventListener('input', () => {
    previewTitle.textContent = titleInput.value || 'Your Blog Title Here';
  });document.addEventListener('DOMContentLoaded', () => {
  const welcomeUser = document.getElementById('welcomeUser');
  const blogsList = document.getElementById('blogsList');
  const blogForm = document.getElementById('blogForm');
  const titleInput = document.getElementById('title');
  const categorySelect = document.getElementById('category');
  const contentDiv = document.getElementById('content');
  const charCount = document.getElementById('charCount');
  const messageDiv = document.getElementById('message');
  const logoutBtn = document.getElementById('logoutBtn');
  const resetBtn = document.getElementById('resetBtn');
  const imageUploader = document.getElementById('imageUploader');

  const previewTitle = document.getElementById('previewTitle');
  const previewCategory = document.getElementById('previewCategory');
  const previewContent = document.getElementById('previewContent');

  // Live preview
  titleInput.addEventListener('input', () => {
    previewTitle.textContent = titleInput.value || 'Your Blog Title Here';
  });

  categorySelect.addEventListener('change', () => {
    previewCategory.innerHTML = `<strong>Category:</strong> ${categorySelect.value || 'None'}`;
  });

  contentDiv.addEventListener('input', () => {
    const textLength = contentDiv.innerText.length;
    charCount.textContent = `${textLength} / 2000 characters`;
    previewContent.innerHTML = contentDiv.innerHTML || 'Your blog content will appear here as you type...';
    charCount.style.color = textLength > 2000 ? 'red' : '';
  });

  // Image upload and insert
  imageUploader.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.imageUrl) {
        const imgTag = `<img src="${data.imageUrl}" alt="uploaded" style="max-width:100%;margin:10px 0;" />`;
        contentDiv.innerHTML += imgTag;
        previewContent.innerHTML = contentDiv.innerHTML;
        const textLength = contentDiv.innerText.length;
        charCount.textContent = `${textLength} / 2000 characters`;
      } else {
        alert('Image upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Image upload error');
    }
  });

  // Load user profile data and existing blogs
  async function loadProfile() {
    try {
      const res = await fetch('/profile/data');
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();

      welcomeUser.textContent = `Welcome, ${data.username || data.name || 'User'}!`;

      blogsList.innerHTML = data.blogs.length === 0
        ? '<p>No blogs published yet.</p>'
        : data.blogs.map(blog => `
            <div class="blog-item">
              <h3>${escapeHtml(blog.title)}</h3>
              <p><strong>Category:</strong> ${escapeHtml(blog.category)}</p>
              <div>${blog.content}</div>
            </div>
          `).join('');
    } catch (error) {
      window.location.href = 'login.html';
    }
  }

  // Submit blog
  blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const content = contentDiv.innerHTML.trim();
    const plainTextLength = contentDiv.innerText.length;

    if (!title || !category || !content) return showMessage('Please fill in all blog fields.', 'red');
    if (plainTextLength > 2000) return showMessage('Content exceeds 2000 characters.', 'red');

    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content }),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(result.message || 'Blog published successfully!', 'green');
        blogForm.reset();
        contentDiv.innerHTML = '';
        previewTitle.textContent = 'Your Blog Title Here';
        previewCategory.innerHTML = '<strong>Category:</strong> None';
        previewContent.innerHTML = 'Your blog content will appear here as you type...';
        charCount.textContent = '0 / 2000 characters';
        loadProfile();
      } else {
        showMessage(result.error || 'Failed to publish blog.', 'red');
      }
    } catch (err) {
      showMessage('Server error. Please try again.', 'red');
    }
  });

  // Reset form
  resetBtn.addEventListener('click', () => {
    blogForm.reset();
    contentDiv.innerHTML = '';
    charCount.textContent = '0 / 2000 characters';
    messageDiv.textContent = '';
    previewTitle.textContent = 'Your Blog Title Here';
    previewCategory.innerHTML = '<strong>Category:</strong> None';
    previewContent.innerHTML = 'Your blog content will appear here as you type...';
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    window.location.href = '/logout';
  });

  // Show message
  function showMessage(msg, color) {
    messageDiv.style.color = color;
    messageDiv.textContent = msg;
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initial load
  loadProfile();
});


  categorySelect.addEventListener('change', () => {
    previewCategory.innerHTML = `<strong>Category:</strong> ${categorySelect.value || 'None'}`;
  });

  contentDiv.addEventListener('input', () => {
    const textLength = contentDiv.innerText.length;
    charCount.textContent = `${textLength} / 2000 characters`;
    previewContent.innerHTML = contentDiv.innerHTML || 'Your blog content will appear here as you type...';

    if (textLength > 2000) {
      charCount.style.color = 'red';
    } else {
      charCount.style.color = '';
    }
  });

  // Load user profile data and existing blogs
  async function loadProfile() {
    try {
      const res = await fetch('/profile/data');
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();

      // Show welcome message
      if (welcomeUser) {
        welcomeUser.textContent = `Welcome, ${data.username || data.name || 'User'}!`;
      }

      // Display blogs
      if (data.blogs.length === 0) {
        blogsList.innerHTML = '<p>No blogs published yet.</p>';
      } else {
        blogsList.innerHTML = '';
        data.blogs.forEach(blog => {
          const blogDiv = document.createElement('div');
          blogDiv.classList.add('blog-item');
          blogDiv.innerHTML = `
            <h3>${escapeHtml(blog.title)}</h3>
            <p><strong>Category:</strong> ${escapeHtml(blog.category)}</p>
            <p>${blog.content}</p>
          `;
          blogsList.appendChild(blogDiv);
        });
      }
    } catch (error) {
      window.location.href = 'login.html';
    }
  }

  // Sanitize input to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Submit blog
  blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const content = contentDiv.innerHTML.trim();

    if (!title || !category || !content) {
      return showMessage('Please fill in all blog fields.', 'red');
    }

    if (content.length > 2000) {
      return showMessage('Content exceeds 2000 characters.', 'red');
    }

    try {
      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage(result.message || 'Blog published successfully!', 'green');
        blogForm.reset();
        contentDiv.innerHTML = '';
        charCount.textContent = '0 / 2000 characters';

        // Reset preview too
        previewTitle.textContent = 'Your Blog Title Here';
        previewCategory.innerHTML = '<strong>Category:</strong> None';
        previewContent.textContent = 'Your blog content will appear here as you type...';

        loadProfile(); // Reload blogs
      } else {
        showMessage(result.error || 'Failed to publish blog.', 'red');
      }
    } catch (err) {
      showMessage('Server error. Please try again.', 'red');
    }
  });

  // Reset form
  resetBtn.addEventListener('click', () => {
    blogForm.reset();
    contentDiv.innerHTML = '';
    charCount.textContent = '0 / 2000 characters';
    messageDiv.textContent = '';

    previewTitle.textContent = 'Your Blog Title Here';
    previewCategory.innerHTML = '<strong>Category:</strong> None';
    previewContent.textContent = 'Your blog content will appear here as you type...';
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    window.location.href = '/logout';
  });

  // Show message
  function showMessage(msg, color) {
    messageDiv.style.color = color;
    messageDiv.textContent = msg;
  }

  // Initial load
  loadProfile();
});
