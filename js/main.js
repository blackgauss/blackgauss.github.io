// ================================
// Main JavaScript
// Handles navigation, dynamic content loading, and UI interactions
// ================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    initNavigation();
    setCurrentYear();
    loadPageContent();
    initScrollEffects();
});

// ================================
// Navigation
// ================================

function initNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', !isExpanded);
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                if (hamburger) {
                    hamburger.classList.remove('active');
                    hamburger.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideNav = navMenu.contains(event.target) || hamburger.contains(event.target);
        if (!isClickInsideNav && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            if (hamburger) {
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        }
    });
}

// ================================
// Scroll Effects
// ================================

function initScrollEffects() {
    // No scroll effects - static whitepaper style
}

// ================================
// Content Loading
// ================================

function loadPageContent() {
    // Check which page we're on
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage.includes('about')) {
        loadAboutContent();
    } else if (currentPage.includes('projects')) {
        loadProjectsContent();
    }
}

function loadAboutContent() {
    if (typeof siteConfig === 'undefined') return;

    // Load personal info
    const profileName = document.getElementById('profileName');
    const profileTitle = document.getElementById('profileTitle');
    const bioContent = document.getElementById('bioContent');
    const contactEmail = document.getElementById('contactEmail');
    const contactLocation = document.getElementById('contactLocation');

    if (profileName) profileName.textContent = siteConfig.personal.name;
    if (profileTitle) profileTitle.textContent = siteConfig.personal.title;
    if (contactEmail) contactEmail.textContent = siteConfig.personal.email;
    if (contactLocation) contactLocation.textContent = siteConfig.personal.location;

    // Load bio
    if (bioContent && siteConfig.personal.bio) {
        bioContent.innerHTML = siteConfig.personal.bio
            .map(paragraph => `<p>${paragraph}</p>`)
            .join('');
    }

    // Load education
    const educationList = document.getElementById('educationList');
    if (educationList && siteConfig.education) {
        educationList.innerHTML = siteConfig.education.map(edu => `
            <div class="education-item">
                <h3 class="education-degree">${edu.degree}</h3>
                <p class="education-school">${edu.school}</p>
                <p class="education-year">${edu.year}</p>
                ${edu.description ? `<p class="education-description">${edu.description}</p>` : ''}
            </div>
        `).join('');
    }

    // Load skills
    const skillsGrid = document.getElementById('skillsGrid');
    if (skillsGrid && siteConfig.skills) {
        skillsGrid.innerHTML = siteConfig.skills
            .map(skill => `<div class="skill-tag">${skill}</div>`)
            .join('');
    }
}

function loadProjectsContent() {
    if (typeof siteConfig === 'undefined') return;

    const projectsGrid = document.getElementById('projectsGrid');
    const emptyState = document.getElementById('emptyState');

    if (!projectsGrid) return;

    // Check if we have projects
    if (!siteConfig.projects || siteConfig.projects.length === 0) {
        projectsGrid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    // Load projects
    siteConfig.projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        if (project.status) {
            const statusSpan = document.createElement('span');
            statusSpan.className = `project-status status-${project.status}`;
            const statusText = project.status
                .replace('wip', 'In Progress')
                .replace('active', 'Active')
                .replace('completed', 'Completed');
            statusSpan.textContent = statusText;
            card.appendChild(statusSpan);
        }
        
        const header = document.createElement('div');
        header.className = 'project-header';
        const title = document.createElement('h3');
        title.className = 'project-title';
        title.textContent = project.title;
        header.appendChild(title);
        card.appendChild(header);
        
        const desc = document.createElement('p');
        desc.className = 'project-description';
        desc.textContent = project.description;
        card.appendChild(desc);
        
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'project-tags';
        project.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'project-tag';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });
        card.appendChild(tagsDiv);
        
        const linksDiv = document.createElement('div');
        linksDiv.className = 'project-links';
        
        if (project.links.demo) {
            const demoLink = document.createElement('a');
            demoLink.href = project.links.demo;
            demoLink.className = 'project-link';
            demoLink.target = '_blank';
            demoLink.rel = 'noopener';
            demoLink.textContent = 'Live Demo →';
            linksDiv.appendChild(demoLink);
        }
        
        if (project.links.github) {
            const githubLink = document.createElement('a');
            githubLink.href = project.links.github;
            githubLink.className = 'project-link';
            githubLink.target = '_blank';
            githubLink.rel = 'noopener';
            githubLink.textContent = 'GitHub →';
            linksDiv.appendChild(githubLink);
        }
        
        if (project.links.details) {
            const detailsLink = document.createElement('a');
            detailsLink.href = project.links.details;
            detailsLink.className = 'project-link';
            detailsLink.textContent = 'Details →';
            linksDiv.appendChild(detailsLink);
        }
        
        card.appendChild(linksDiv);
        projectsGrid.appendChild(card);
    });
}

// ================================
// Utility Functions
// ================================

function setCurrentYear() {
    const yearElements = document.querySelectorAll('#currentYear');
    const currentYear = new Date().getFullYear();
    yearElements.forEach(element => {
        element.textContent = currentYear;
    });
}

// No smooth scrolling - instant navigation for whitepaper style

// Log when page is loaded
console.log('Portfolio site initialized');
