# blackgauss.github.io

Personal portfolio website built with static HTML, CSS, and JavaScript.

## 📁 File Structure

```
blackgauss.github.io/
├── index.html              # Landing page
├── about.html              # About page with personal info
├── projects.html           # Projects showcase
├── css/
│   ├── main.css           # Global styles & layout
│   └── components.css     # Reusable component styles
├── js/
│   ├── main.js            # Main JavaScript & UI
│   └── api.js             # API integration module
├── data/
│   └── config.js          # Site configuration (easy editing!)
├── assets/
│   └── images/            # Image assets
└── README.md
```

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/blackgauss/blackgauss.github.io.git
   cd blackgauss.github.io
   ```

2. **Edit your content:**
   Open `data/config.js` and update:
   - Personal information
   - Education
   - Skills
   - Projects
   - Social links

3. **Test locally:**
   Open `index.html` in your browser, or use a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (if you have http-server installed)
   npx http-server
   ```

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Update portfolio content"
   git push origin main
   ```
   Your site will be live at `https://blackgauss.github.io`

## ✏️ Customization Guide

### Update Personal Information

Edit `data/config.js`:

```javascript
personal: {
    name: "Your Name",
    title: "Your Title",
    email: "your.email@example.com",
    location: "Your Location",
    bio: ["Your bio paragraphs here"]
}
```

### Add Projects

Add new projects to the `projects` array in `data/config.js`:

```javascript
projects: [
    {
        title: "Project Name",
        description: "Project description",
        tags: ["Tag1", "Tag2"],
        status: "active", // active, wip, or completed
        links: {
            github: "https://github.com/...",
            demo: "https://...",
            details: null
        }
    }
]
```

### Add Skills

Update the `skills` array in `data/config.js`:

```javascript
skills: ["JavaScript", "Python", "React", "..."]
```

### Customize Styles

- **Colors & Theme**: Edit CSS variables in `css/main.css` (`:root` section)
- **Components**: Modify `css/components.css` for cards, buttons, etc.
- **Layout**: Edit `css/main.css` for page structure

### Connect to APIs

Use `js/api.js` for API integrations:

```javascript
// Update the base URL
API.baseURL = 'https://your-api.com';

// Use the provided functions
const result = await performComputation(data);
```

## 🎨 Features

- **Responsive Design** - Works on all devices
- **Easy Content Management** - Edit one config file
- **API Ready** - Built-in API integration module
- **Modern UI** - Clean, professional design
- **Smooth Animations** - Fade-in effects and transitions
- **Mobile Menu** - Hamburger menu for mobile devices
- **No Build Process** - Pure HTML/CSS/JS

## 📄 Pages

### Landing Page (`index.html`)
- Hero section with welcome message
- Call-to-action buttons

### About Page (`about.html`)
- Personal information
- Bio
- Education
- Skills
- Contact information

### Projects Page (`projects.html`)
- Project cards with descriptions
- Tags and status indicators
- Links to demos and GitHub repos
- Empty state for when no projects exist

## 🔧 Adding API Integration

The `js/api.js` file provides a foundation for connecting to external APIs:

1. Update `API.baseURL` with your API endpoint
2. Add API key if needed: `API.apiKey = 'your-key'`
3. Use provided functions or create new ones
4. Handle responses in the UI

Example:
```javascript
// Fetch computation result
const result = await performComputation({ input: value });
displayComputationResult(result, 'resultContainer');
```

## 📝 Tips

- **Images**: Add profile pictures or project screenshots to `assets/images/`
- **Favicon**: Add `favicon.ico` to the root directory
- **Custom Domain**: Create a `CNAME` file with your domain name
- **Analytics**: Add Google Analytics or other tracking in the `<head>` section

## 🌐 GitHub Pages Setup

1. Go to your repository settings
2. Navigate to "Pages" section
3. Select "main" branch as source
4. Your site will be published at `https://blackgauss.github.io`

## 📦 No Dependencies

This site uses pure HTML, CSS, and JavaScript - no frameworks, no build tools, no npm packages needed!

## 📄 License

Feel free to use this template for your own portfolio!

---

Built with ❤️ by blackgauss