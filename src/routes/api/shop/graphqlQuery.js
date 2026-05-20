import { gql } from "graphql-request";

const SHOP_QUERY = gql`
  query {
    shop {
      id
      name
      email
      primaryDomain {
        host
      }
      currencyCode
      ianaTimezone
      shopOwnerName
      plan {
        shopifyPlus
        publicDisplayName
      }
      billingAddress {
        province
        country
        city
      }
      currencyFormats {
        moneyFormat
        moneyWithCurrencyFormat
      }
      weightUnit
    }
  }
`;

const CREATE_SUBSCRIPTION_MUTATION = `
    mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $trialDays: Int, $returnUrl: URL!, $test: Boolean) {
        appSubscriptionCreate(
            name: $name
            lineItems: $lineItems
            trialDays: $trialDays
            returnUrl: $returnUrl
            test: $test
        ) {
            appSubscription {
                id
                name
                status
                trialDays
                currentPeriodEnd
                test
                lineItems {
                    id
                    plan {
                        pricingDetails {
                            ... on AppRecurringPricing {
                                price {
                                    amount
                                    currencyCode
                                }
                                interval
                            }
                        }
                    }
                }
            }
            confirmationUrl
            userErrors {
                field
                message
            }
        }
    }
`;

const GET_SUBSCRIPTION_QUERY = `
    query getAppSubscription($id: ID!) {
        node(id: $id) {
            ... on AppSubscription {
                id
                name
                status
                trialDays
                currentPeriodEnd
                createdAt
                test
                lineItems {
                    id
                    plan {
                        pricingDetails {
                            ... on AppRecurringPricing {
                                price {
                                    amount
                                    currencyCode
                                }
                                interval
                            }
                        }
                    }
                }
            }
        }
    }
`;

export { SHOP_QUERY, CREATE_SUBSCRIPTION_MUTATION, GET_SUBSCRIPTION_QUERY }