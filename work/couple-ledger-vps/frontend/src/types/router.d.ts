import type { Component } from "vue";
import "vue-router";

export interface FeaturePanel {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}

export interface FeatureAction {
  label: string;
  to?: string;
}

export interface FeatureMeta {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: Component;
  panels?: FeaturePanel[];
  actions?: FeatureAction[];
}

declare module "vue-router" {
  interface RouteMeta {
    public?: boolean;
    admin?: boolean;
    mainTab?: boolean;
    title?: string;
    feature?: FeatureMeta;
  }
}
