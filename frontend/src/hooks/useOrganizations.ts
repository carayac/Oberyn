import { useAuth } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import { mockOrganizations } from "../data/mockOrganizations";
import { apiClient } from "../lib/api/client";
import type { CreateOrganizationInput, Organization } from "../types/organization";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const ACTIVE_ORGANIZATION_KEY = "oberyn.activeOrganizationId";
const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function usePreviewOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>(mockOrganizations);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_ORGANIZATION_KEY) ?? mockOrganizations[0]?.id ?? null);

  function setActiveOrganizationId(organizationId: string | null) {
    setActiveOrganizationIdState(organizationId);
    if (organizationId) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
    else localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  }

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? organizations[0] ?? null,
    [organizations, activeOrganizationId],
  );

  async function createOrganization(input: CreateOrganizationInput) {
    const organization: Organization = {
      id: `org_preview_${Date.now()}`,
      clerkOrgId: "clerk_preview",
      name: input.name,
      slug: input.slug || input.name.toLowerCase().replace(/\s+/g, "-"),
      organizationType: input.organizationType,
      description: input.description,
      region: input.region,
      website: input.website,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrganizations((current) => [organization, ...current]);
    setActiveOrganizationId(organization.id);
    return organization;
  }

  return {
    organizations,
    activeOrganization,
    activeOrganizationId,
    isLoading: false,
    error: null,
    reloadOrganizations: async () => undefined,
    createOrganization,
    setActiveOrganizationId,
  };
}

function useClerkOrganizations() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_ORGANIZATION_KEY));
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function getAuthToken() {
    if (!isLoaded || !isSignedIn) return null;
    return getToken();
  }

  function setActiveOrganizationId(organizationId: string | null) {
    setActiveOrganizationIdState(organizationId);
    if (organizationId) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organizationId);
    else localStorage.removeItem(ACTIVE_ORGANIZATION_KEY);
  }

  async function loadOrganizations() {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const response = await apiClient.get<ApiResponse<Organization[]>>("/organizations", token);
      setOrganizations(response.data);

      const storedId = localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
      const nextActive = response.data.find((organization) => organization.id === storedId)?.id ?? response.data[0]?.id ?? null;
      setActiveOrganizationId(nextActive);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las organizaciones.");
      setOrganizations([]);
      setActiveOrganizationId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [isLoaded, isSignedIn]);

  const activeOrganization = useMemo(
    () => organizations.find((organization) => organization.id === activeOrganizationId) ?? null,
    [organizations, activeOrganizationId],
  );

  async function createOrganization(input: CreateOrganizationInput) {
    const token = await getAuthToken();
    const response = await apiClient.post<ApiResponse<Organization>>("/organizations", input, token);
    setOrganizations((current) => [response.data, ...current]);
    setActiveOrganizationId(response.data.id);
    return response.data;
  }

  return {
    organizations,
    activeOrganization,
    activeOrganizationId,
    isLoading,
    error,
    reloadOrganizations: loadOrganizations,
    createOrganization,
    setActiveOrganizationId,
  };
}

export const useOrganizations = hasClerkKey ? useClerkOrganizations : usePreviewOrganizations;
