// ================================
// Configuration Data
// Edit this file to update site content
// ================================

const siteConfig = {
    // Personal Information
    personal: {
        name: "Erik I-J",
        title: "Machine Learning Engineer | Aspiring Mathematician",
        email: "iykyk@example.com",
        location: "San Francisco, California",
        bio: [
            "Hello. I like mathematics and it's implimentations on computers.",
            "I currently work as a Machine Learning Engineer on the modelling team in a performance AdTech company."
        ]
    },

    // Education
    education: [
        {
            degree: "Bachelor of Science in Mathematics",
            school: "California Institute of Technology",
            year: "2025",
            //description: "Minor in Mathematics"
        }
    ],

    // Skills
    skills: [
        "Probability Modeling",
        "Abstract Algebra",
        "Machine Learning Engineering",
        "Computer Simulation",
        "Software for Mathematics"
    ],

    // Projects (can also be loaded from API)
    projects: [
        {
            title: "PocketPartition",
            description: "A Python package for working with numerical semigroups and partitions, providing tools for analysis and computation in algebraic combinatorics.",
            tags: ["Python", "Combinatorics"],
            status: "on hold", // active, wip, completed
            links: {
                github: "https://github.com/blackgauss/pocketpartition",
                details: null
            }
        },
    ],

    // Social Links
    social: {
        github: "https://github.com/blackgauss",
        linkedin: "https://linkedin.com/in/erikimaj",
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = siteConfig;
}
