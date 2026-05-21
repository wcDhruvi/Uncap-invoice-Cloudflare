import { useState, useEffect, useCallback } from "react";
import {
  Select,
  BlockStack,
  Box,
  TextField,
  Button,
  Spinner,
  Text,
  InlineStack
} from "@shopify/polaris";

// Google Fonts Component
function GoogleFontSelector({ selectedFont, onFontChange, label }) {
  const [fonts, setFonts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFonts, setFilteredFonts] = useState([]);

  // Popular/common Google Fonts - as a fallback if API fails
  const popularFonts = [
    { family: "Roboto", category: "sans-serif" },
    { family: "Open Sans", category: "sans-serif" },
    { family: "Lato", category: "sans-serif" },
    { family: "Montserrat", category: "sans-serif" },
    { family: "Oswald", category: "sans-serif" },
    { family: "Source Sans Pro", category: "sans-serif" },
    { family: "Raleway", category: "sans-serif" },
    { family: "PT Sans", category: "sans-serif" },
    { family: "Poppins", category: "sans-serif" },
    // { family: "Nunito Sans", category: "sans-serif" },
    { family: "Playfair Display", category: "serif" },
    { family: "Merriweather", category: "serif" },
    { family: "PT Serif", category: "serif" },
    { family: "Ubuntu", category: "sans-serif" },
    { family: "Lora", category: "serif" },
    { family: "Rubik", category: "sans-serif" },
    { family: "Nunito", category: "sans-serif" },
    { family: "Work Sans", category: "sans-serif" },
    { family: "Fira Sans", category: "sans-serif" },
    { family: "Quicksand", category: "sans-serif" },
    // { family: "Delius", category: "cursive" },
    // { family: "Delius Swash Caps", category: "cursive" },
  ];

  useEffect(() => {
    async function fetchGoogleFonts() {
      try {
        // const response = await fetch(
        //   "https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyAOES8EmKhuJELQYDJ_KKNvvmwFLlQE_m0&sort=popularity"
        // );

        // if (!response.ok) {
        //   throw new Error('Network response was not ok');
        // }

        // const data = await response.json();
        // setFonts(data.items || []);
        // setFilteredFonts(data.items || []);
        setFonts(popularFonts);
        setFilteredFonts(popularFonts);
      } catch (error) {
        console.error("Failed to fetch Google Fonts:", error);
        // Fallback to predefined popular fonts
        setFonts(popularFonts);
        setFilteredFonts(popularFonts);
      } finally {
        setLoading(false);
      }
    }

    fetchGoogleFonts();
  }, []);

  // Filter fonts when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = fonts.filter(font =>
        font.family.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFonts(filtered);
    } else {
      setFilteredFonts(fonts);
    }
  }, [searchTerm, fonts]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const fontOptions = filteredFonts.map(font => ({
    label: font.family,
    value: font.family
  }));

  return (
    <BlockStack gap="300">
      {/* <Text as="h3" variant="headingMd">{label || "Select Font"}</Text> */}

      {/* <TextField
        label="Search fonts"
        value={searchTerm}
        onChange={handleSearchChange}
        autoComplete="off"
        placeholder="Type to search fonts..."
      /> */}

      {loading ? (
        <Box padding="400" alignment="center">
          <Spinner size="small" />
        </Box>
      ) : (
        <Select
          label={label}
          options={fontOptions}
          onChange={onFontChange}
          value={selectedFont}
        />
      )}

      {/* {selectedFont && (
        <Box padding="300" background="surface" borderRadius="100">
          <InlineStack gap="200">
            <Text as="span" variant="bodyMd">Preview:</Text>
            <div style={{
              fontFamily: `"${selectedFont}", sans-serif`,
              fontSize: "16px"
            }}>
              The quick brown fox jumps over the lazy dog.
            </div>
          </InlineStack>
        </Box>
      )} */}

      <div id="font-loader" style={{ position: "absolute", visibility: "hidden" }}>
        {selectedFont && (
          <link
            href={`https://fonts.googleapis.com/css?family=${selectedFont.replace(' ', '+')}&display=swap`}
            rel="stylesheet"
          />
        )}
      </div>
    </BlockStack>
  );
}

export default GoogleFontSelector;