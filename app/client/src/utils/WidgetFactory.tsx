import {
  WidgetBuilder,
  WidgetDataProps,
  WidgetProps,
  WidgetState,
} from "widgets/BaseWidget";
import React from "react";
import {
  PropertyPaneConfig,
  PropertyPaneControlConfig,
  ValidationConfig,
} from "constants/PropertyControlConstants";
import { generateReactKey } from "./generators";
import { WidgetConfigProps } from "reducers/entityReducers/widgetConfigReducer";
import { ValidationTypes } from "constants/WidgetValidation";
import { RenderMode } from "constants/WidgetConstants";
import * as log from "loglevel";

type WidgetDerivedPropertyType = any;
export type DerivedPropertiesMap = Record<string, string>;

// TODO (abhinav): To enforce the property pane config structure in this function
// Throw an error if the config is not of the desired format.
const addPropertyConfigIds = (config: PropertyPaneConfig[]) => {
  return config.map((sectionOrControlConfig: PropertyPaneConfig) => {
    sectionOrControlConfig.id = generateReactKey();
    if (sectionOrControlConfig.children) {
      sectionOrControlConfig.children = addPropertyConfigIds(
        sectionOrControlConfig.children,
      );
    }
    const config = sectionOrControlConfig as PropertyPaneControlConfig;
    if (
      config.panelConfig &&
      config.panelConfig.children &&
      Array.isArray(config.panelConfig.children)
    ) {
      config.panelConfig.children = addPropertyConfigIds(
        config.panelConfig.children,
      );

      (sectionOrControlConfig as PropertyPaneControlConfig) = config;
    }
    return sectionOrControlConfig;
  });
};

export type WidgetType = typeof WidgetFactory.widgetTypes[number];

function validatePropertyPaneConfig(config: PropertyPaneConfig[]) {
  return config.map((sectionOrControlConfig: PropertyPaneConfig) => {
    if (sectionOrControlConfig.children) {
      sectionOrControlConfig.children = sectionOrControlConfig.children.map(
        validatePropertyControl,
      );
    }
    return sectionOrControlConfig;
  });
}

function validatePropertyControl(
  config: PropertyPaneConfig,
): PropertyPaneConfig {
  const _config = config as PropertyPaneControlConfig;
  if (_config.validation !== undefined) {
    _config.validation = validateValidationStructure(_config.validation);
  }

  if (_config.children) {
    _config.children = _config.children.map(validatePropertyControl);
  }

  if (_config.panelConfig) {
    _config.panelConfig.children = _config.panelConfig.children.map(
      validatePropertyControl,
    );
  }
  return _config;
}

function validateValidationStructure(
  config: ValidationConfig,
): ValidationConfig {
  // Todo(abhinav): This only checks for top level params. Throwing nothing here.
  if (
    config.type === ValidationTypes.FUNCTION &&
    config.params &&
    config.params.fn
  ) {
    config.params.fnString = config.params.fn.toString();
    if (!config.params.expected)
      log.error(
        `Error in configuration ${JSON.stringify(config)}: For a ${
          ValidationTypes.FUNCTION
        } type validation, expected type and example are mandatory`,
      );
    delete config.params.fn;
  }
  return config;
}
class WidgetFactory {
  static widgetTypes: Record<string, string> = {};
  static widgetMap: Map<
    WidgetType,
    WidgetBuilder<WidgetProps, WidgetState>
  > = new Map();
  static widgetDerivedPropertiesGetterMap: Map<
    WidgetType,
    WidgetDerivedPropertyType
  > = new Map();
  static derivedPropertiesMap: Map<
    WidgetType,
    DerivedPropertiesMap
  > = new Map();
  static defaultPropertiesMap: Map<
    WidgetType,
    Record<string, string>
  > = new Map();
  static metaPropertiesMap: Map<WidgetType, Record<string, any>> = new Map();
  static propertyPaneConfigsMap: Map<
    WidgetType,
    readonly PropertyPaneConfig[]
  > = new Map();

  static widgetConfigMap: Map<
    WidgetType,
    Partial<WidgetProps> & WidgetConfigProps & { type: string }
  > = new Map();

  static registerWidgetBuilder(
    widgetType: string,
    widgetBuilder: WidgetBuilder<WidgetProps, WidgetState>,
    derivedPropertiesMap: DerivedPropertiesMap,
    defaultPropertiesMap: Record<string, string>,
    metaPropertiesMap: Record<string, any>,
    propertyPaneConfig?: PropertyPaneConfig[],
  ) {
    if (!this.widgetTypes[widgetType]) {
      this.widgetTypes[widgetType] = widgetType;
      this.widgetMap.set(widgetType, widgetBuilder);
      this.derivedPropertiesMap.set(widgetType, derivedPropertiesMap);
      this.defaultPropertiesMap.set(widgetType, defaultPropertiesMap);
      this.metaPropertiesMap.set(widgetType, metaPropertiesMap);

      if (propertyPaneConfig) {
        const validatedPropertyPaneConfig = validatePropertyPaneConfig(
          propertyPaneConfig,
        );

        this.propertyPaneConfigsMap.set(
          widgetType,
          Object.freeze(addPropertyConfigIds(validatedPropertyPaneConfig)),
        );
      }
    }
  }

  static storeWidgetConfig(
    widgetType: string,
    config: Partial<WidgetProps> & WidgetConfigProps & { type: string },
  ) {
    this.widgetConfigMap.set(widgetType, Object.freeze(config));
  }

  static createWidget(
    widgetData: WidgetDataProps,
    renderMode: RenderMode,
  ): React.ReactNode {
    const widgetProps: WidgetProps = {
      key: widgetData.widgetId,
      isVisible: true,
      ...widgetData,
      renderMode,
    };
    const widgetBuilder = this.widgetMap.get(widgetData.type);
    if (widgetBuilder) {
      // TODO validate props here
      const widget = widgetBuilder.buildWidget(widgetProps);
      return widget;
    } else {
      const ex: WidgetCreationException = {
        message:
          "Widget Builder not registered for widget type" + widgetData.type,
      };
      log.error(ex);
      return null;
    }
  }

  static getWidgetTypes(): WidgetType[] {
    return Array.from(this.widgetMap.keys());
  }

  static getWidgetDerivedPropertiesMap(
    widgetType: WidgetType,
  ): DerivedPropertiesMap {
    const map = this.derivedPropertiesMap.get(widgetType);
    if (!map) {
      log.error("Widget type validation is not defined");
      return {};
    }
    return map;
  }

  static getWidgetDefaultPropertiesMap(
    widgetType: WidgetType,
  ): Record<string, string> {
    const map = this.defaultPropertiesMap.get(widgetType);
    if (!map) {
      log.error("Widget default properties not defined", widgetType);
      return {};
    }
    return map;
  }

  static getWidgetMetaPropertiesMap(
    widgetType: WidgetType,
  ): Record<string, unknown> {
    const map = this.metaPropertiesMap.get(widgetType);
    if (!map) {
      log.error("Widget meta properties not defined: ", widgetType);
      return {};
    }
    return map;
  }

  static getWidgetPropertyPaneConfig(
    type: WidgetType,
  ): readonly PropertyPaneConfig[] {
    const map = this.propertyPaneConfigsMap.get(type);
    if (!map) {
      log.error("Widget property pane configs not defined", type);
      return [];
    }
    return map;
  }

  static getWidgetTypeConfigMap(): WidgetTypeConfigMap {
    const typeConfigMap: WidgetTypeConfigMap = {};
    WidgetFactory.getWidgetTypes().forEach((type) => {
      typeConfigMap[type] = {
        defaultProperties: WidgetFactory.getWidgetDefaultPropertiesMap(type),
        derivedProperties: WidgetFactory.getWidgetDerivedPropertiesMap(type),
        metaProperties: WidgetFactory.getWidgetMetaPropertiesMap(type),
      };
    });
    return typeConfigMap;
  }
}

export type WidgetTypeConfigMap = Record<
  string,
  {
    defaultProperties: Record<string, string>;
    metaProperties: Record<string, any>;
    derivedProperties: WidgetDerivedPropertyType;
  }
>;

export interface WidgetCreationException {
  message: string;
}

export default WidgetFactory;
