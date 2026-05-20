import { GraphQLClient } from 'graphql-request';

const MUTATIONS = {
  CREATE_STAGED_UPLOADS: `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `,

  CREATE_FILE: `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          fileStatus
          ... on MediaImage {
            image {
              url
              width
              height
            }
          }
        }
        userErrors { field message }
      }
    }
  `,
  
  GET_FILE_STATUS: `
    query GetFileStatus($id: ID!) {
      node(id: $id) {
        ... on MediaImage {
          id
          fileStatus
          image {
            url
            width
            height
          }
        }
        ... on GenericFile {
          id
          fileStatus
          url
        }
      }
    }
  `
};

export const uploadFile = async (shopDomain, accessToken, fileParams) => {
  if (!shopDomain || !accessToken) {
    return { success: false, data: null, errors: ["Shop domain and access token are required"] };
  }

  if (!fileParams || !fileParams.filename || !fileParams.mimetype) {
    return {
      success: false,
      data: null,
      errors: ["File data is required with filename and mimetype"],
    };
  }

  const client = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  });

  try {
    // 1. Prepare Buffer
    let fileBuffer;
    if (fileParams.encoding?.includes("base64,")) {
      fileBuffer = Buffer.from(fileParams.encoding.split("base64,")[1], "base64");
    } else if (fileParams.encoding) {
      fileBuffer = Buffer.from(fileParams.encoding, "base64");
    } else {
      return { success: false, data: null, errors: ["Missing file encoding payload"] };
    }

    console.log(`Creating staged upload for file: ${fileParams.filename}`);

    // 2. Create staged upload
    const stagedRes = await client.request(MUTATIONS.CREATE_STAGED_UPLOADS, {
      input: [
        {
          resource: fileParams.resource || "FILE",
          filename: fileParams.filename,
          mimeType: fileParams.mimetype,
          httpMethod: "POST",
        },
      ],
    });

    if (stagedRes.stagedUploadsCreate?.userErrors?.length) {
      return {
        success: false,
        data: null,
        errors: stagedRes.stagedUploadsCreate.userErrors.map((e) => e.message),
      };
    }

    const target = stagedRes.stagedUploadsCreate.stagedTargets?.[0];
    if (!target) {
      return { success: false, data: null, errors: ["No staged upload target was returned"] };
    }

    console.log(`Uploading file to staged URL: ${target.url}`);

    // 3. Upload file to Shopify Staged URL
    const form = new FormData();
    target.parameters.forEach((p) => form.append(p.name, p.value));
    
    // In Cloudflare Workers, Blob is available globally
    form.append("file", new Blob([fileBuffer]), fileParams.filename);

    const uploadRes = await fetch(target.url, {
      method: "POST",
      body: form,
    });

    if (!uploadRes.ok) {
      const uploadBody = await uploadRes.text();
      console.error(`Upload Failed: ${uploadRes.status}`, uploadBody);
      return { success: false, data: null, errors: [`Failed uploading to Shopify S3: ${uploadRes.status}`] };
    }

    console.log(`Committing file to Shopify Files: ${target.resourceUrl}`);

    // 4. Commit file into Shopify "Files"
    const createRes = await client.request(MUTATIONS.CREATE_FILE, {
      files: [
        {
          alt: fileParams.filename,
          contentType: fileParams.resource || "FILE",
          originalSource: target.resourceUrl,
          filename: fileParams.filename,
        },
      ],
    });

    if (createRes.fileCreate?.userErrors?.length) {
      return { success: false, data: null, errors: createRes.fileCreate.userErrors.map((e) => e.message) };
    }

    const createdFile = createRes.fileCreate.files?.[0];
    if (!createdFile) {
      return { success: false, data: null, errors: ["File was not created in Shopify"] };
    }

    console.log(`Polling file status: ${createdFile.id}`);

    // 5. Poll for READY status
    let attempts = 0;
    let fileStatus = createdFile.fileStatus;

    while (fileStatus !== "READY" && fileStatus !== "FAILED") {
      attempts++;
      console.log(`Polling attempt ${attempts}, current status: ${fileStatus}`);

      if (attempts > 1) {
        // Wait 1s for the first 10 attempts, then 2s
        const interval = attempts <= 10 ? 1000 : 2000;
        await new Promise((res) => setTimeout(res, interval));
      }

      if (attempts >= 15) break; // Don't block indefinitely

      const statusRes = await client.request(MUTATIONS.GET_FILE_STATUS, { id: createdFile.id });
      if (!statusRes.node) break;

      fileStatus = statusRes.node.fileStatus;
      createdFile.fileStatus = fileStatus;
      if (statusRes.node.image) createdFile.image = statusRes.node.image;
      if (statusRes.node.url) createdFile.url = statusRes.node.url;
    }

    if (fileStatus === "FAILED") {
      return { success: false, data: null, errors: [`Shopify failed to process file: ${createdFile.id}`] };
    }

    if (fileStatus !== "READY") {
      return { success: false, data: null, errors: [`File processing timed out: ${createdFile.id}`] };
    }

    console.log(`File processed successfully: ${createdFile.id}`);

    return {
      success: true,
      data: { file: createdFile, shopDomain },
      errors: [],
    };

  } catch (error) {
    console.error("Error uploading file: ", error);
    return {
      success: false,
      data: null,
      errors: ["Internal server error: " + error.message],
    };
  }
};
