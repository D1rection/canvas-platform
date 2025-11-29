import React from "react";
import { Modal, Button, Space } from "@arco-design/web-react";
import { IconHistory, IconDelete } from "@arco-design/web-react/icon";

interface RecoveryModalProps {
  visible: boolean;
  onRecover: () => void;
  onReset: () => void;
}

/**
 * 恢复画布提示弹窗
 * - 当检测到持久化数据时显示
 * - 用户可选择恢复或重置
 */
export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  visible,
  onRecover,
  onReset,
}) => {
  return (
    <Modal
      title="检测到未保存的画布"
      visible={visible}
      footer={null}
      closable={false}
      maskClosable={false}
      style={{ maxWidth: 400 }}
    >
      <p style={{ marginBottom: 48, color: "#666" }}>
        检测到上次编辑的画布内容，是否恢复？
      </p>
      <Space style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          icon={<IconDelete />}
          onClick={onReset}
        >
          重置为空画布
        </Button>
        <Button
          type="primary"
          icon={<IconHistory />}
          onClick={onRecover}
        >
          恢复画布
        </Button>
      </Space>
    </Modal>
  );
};

