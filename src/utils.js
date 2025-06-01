const turkishMonths = {
    'Oca': 0, 'Şub': 1, 'Mar': 2, 'Nis': 3,
    'May': 4, 'Haz': 5, 'Tem': 6, 'Ağu': 7,
    'Eyl': 8, 'Eki': 9, 'Kas': 10, 'Ara': 11
};

function parseTurkishDate(dateString) {
    if (!dateString) return null;

    // Example date format: 21 May
    const numericPatterns = [
        /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/,
        /(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/
    ];
    for (const pattern of numericPatterns) {
        const match = dateString.match(pattern);
        if (match) {
            const [, first, second, third] = match;
            try {
                if (first.length === 4) {
                    return new Date(parseInt(first), parseInt(second) - 1, parseInt(third));
                } else {
                    return new Date(parseInt(third), parseInt(second) - 1, parseInt(first));
                }
            } catch {
                continue;
            }
        }
    }

    for (const [monthName, monthIndex] of Object.entries(turkishMonths)) {
        if (dateString.toLowerCase().includes(monthName.toLowerCase())) {
            const dayMatch = dateString.match(/(\d{1,2})/);
            const yearMatch = dateString.match(/(\d{4})/);
            if (dayMatch) {
                try {
                    // If no year is provided, use current year
                    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
                    return new Date(year, monthIndex, parseInt(dayMatch[1]));
                } catch {
                    continue;
                }
            }
        }
    }
    return null;
}

function escapeXML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = { parseTurkishDate, escapeXML };