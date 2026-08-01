(function () {
  "use strict";

  const monthNumbers = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  function trimText(value) {
    return String(value ?? "").trim();
  }

  function parseDateAdded(value) {
    const text = trimText(value);
    if (!text) return null;

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const namedMatch = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
    let year;
    let month;
    let day;

    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]) - 1;
      day = Number(isoMatch[3]);
    } else if (namedMatch && monthNumbers[namedMatch[1].toLowerCase()] !== undefined) {
      year = Number(namedMatch[3]);
      month = monthNumbers[namedMatch[1].toLowerCase()];
      day = Number(namedMatch[2]);
    } else {
      const parsed = new Date(text);
      if (Number.isNaN(parsed.getTime())) return null;
      year = parsed.getFullYear();
      month = parsed.getMonth();
      day = parsed.getDate();
    }

    const date = new Date(Date.UTC(year, month, day));
    if (
      date.getUTCFullYear() !== year
      || date.getUTCMonth() !== month
      || date.getUTCDate() !== day
    ) return null;
    return date;
  }

  function parseReleaseYear(value) {
    const text = trimText(value);
    if (!/^\d{4}$/.test(text)) return null;
    const year = Number(text);
    return year >= 1800 && year <= new Date().getUTCFullYear() ? year : null;
  }

  function cleanRecords(sourceRecords) {
    const summary = {
      totalRecordsProcessed: sourceRecords.length,
      missingValuesFound: {
        director: 0,
        cast: 0,
        country: 0,
        dateAdded: 0,
        rating: 0,
        duration: 0
      },
      whitespaceValuesTrimmed: 0,
      datesSuccessfullyParsed: 0,
      datesLeftMissingOrInvalid: 0,
      suspiciousRatingDurationRecordsCorrected: 0,
      suspiciousRatingDurationRecordsFlagged: 0
    };

    const records = sourceRecords.map(function (sourceRecord) {
      const raw = { ...sourceRecord.raw };
      const canonical = sourceRecord.canonical;
      const qualityFlags = [];

      Object.values(raw).forEach(function (value) {
        if (typeof value === "string" && value !== value.trim()) {
          summary.whitespaceValuesTrimmed += 1;
        }
      });

      ["director", "cast", "country", "date_added", "rating", "duration"].forEach(function (field) {
        if (trimText(raw[field]) === "") {
          const summaryField = field === "date_added" ? "dateAdded" : field;
          summary.missingValuesFound[summaryField] += 1;
          qualityFlags.push(`MISSING_${field.toUpperCase()}`);
        }
      });

      const rawDateAdded = canonical.dateAdded ?? "";
      const dateAddedText = trimText(rawDateAdded);
      const dateAdded = parseDateAdded(rawDateAdded);
      if (dateAdded) summary.datesSuccessfullyParsed += 1;
      else {
        summary.datesLeftMissingOrInvalid += 1;
        if (dateAddedText) qualityFlags.push("INVALID_DATE_ADDED");
      }

      const rawReleaseYear = canonical.releaseYear ?? "";
      const releaseYear = parseReleaseYear(rawReleaseYear);
      if (trimText(rawReleaseYear) && releaseYear === null) {
        qualityFlags.push("INVALID_RELEASE_YEAR");
      }

      let rating = trimText(canonical.rating);
      let duration = trimText(raw.duration);
      const durationInRating = /^\d+\s+min$/i.test(rating);
      if (
        trimText(canonical.type).toLowerCase() === "movie"
        && durationInRating
        && duration === ""
      ) {
        duration = rating;
        rating = "Unknown";
        qualityFlags.push("TARGETED_RATING_DURATION_CORRECTION");
        summary.suspiciousRatingDurationRecordsCorrected += 1;
      } else if (durationInRating) {
        qualityFlags.push("SUSPICIOUS_RATING_DURATION");
        summary.suspiciousRatingDurationRecordsFlagged += 1;
      }

      return {
        id: sourceRecord.id,
        sourceRecordId: sourceRecord.id,
        showId: trimText(raw.show_id),
        title: trimText(canonical.title),
        type: trimText(canonical.type),
        country: trimText(canonical.country),
        genre: trimText(canonical.genre),
        rating,
        releaseYear,
        dateAdded,
        dateAddedRaw: dateAddedText,
        description: trimText(canonical.description),
        director: trimText(raw.director),
        cast: trimText(raw.cast),
        duration,
        raw,
        dataQuality: qualityFlags
      };
    });

    return { records, summary };
  }

  window.CatalogDataCleaning = { cleanRecords };
}());
