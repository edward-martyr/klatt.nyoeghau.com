const copyrightElement = document.getElementById("copyright");
const year = new Date().getFullYear();
const copyrightYearRange = year === 2022 ? "2022" : `2022‒${year}`;
copyrightElement.innerHTML = `© ${copyrightYearRange} by Yuanhao Chen.`;
